import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 necesario para ngModel
import { Router } from '@angular/router';
import { PresentationService } from '../../services/presentation.service';
import { Presentation } from '../../models/presentation.model';

import { NgChartsModule } from 'ng2-charts';
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  BarElement, ArcElement, Tooltip, Legend, Filler,
  ChartOptions, ChartData, Plugin, TooltipItem
} from 'chart.js';
import { computeEmotionScore } from '../../../shared/emotion-score.util';
import { forkJoin } from 'rxjs';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, BarElement, ArcElement, Tooltip, Legend, Filler);

/** ===== Plugin: puntero atado al FIN del arco de progreso ===== */
const GaugePointerPlugin = {
  id: 'gaugePointer',
  afterDatasetsDraw(chart: any, _args: any, opts: any) {
    if (!opts?.show) return;
    const meta = chart.getDatasetMeta(1);
    if (!meta?.data?.length) return;

    const arc: any = meta.data[0];
    const { x, y, outerRadius, endAngle } = arc.getProps(['x', 'y', 'outerRadius', 'endAngle'], true);

    const ctx = chart.ctx;
    const px = x + outerRadius * Math.cos(endAngle);
    const py = y + outerRadius * Math.sin(endAngle);

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = opts.color || '#0ea5e9';
    ctx.shadowColor = 'rgba(0,0,0,.12)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.restore();
  }
};
Chart.register(GaugePointerPlugin as any);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private router: Router, private presentationService: PresentationService) {}

  /* === UI data === */
  presentations: { id: string; title: string; date: string; image: string }[] = [];
  totalPresentations = 0;

  // Línea
  lineOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    scales: { y: { min:0, max:5, ticks:{ stepSize:1 } }, x: { grid: { display:false } } },
    plugins: { legend: { display:false }, tooltip: { intersect:false, mode:'index' } },
    elements: { line: { tension:.3, fill:false } }
  };
  lineData: ChartData<'line'> = { labels: [], datasets: [{ data: [], borderColor:'#00bfa6', pointRadius:3 }] };

  // Barras (se recalcula según período)
  barOptions: ChartOptions<'bar'> = {
    responsive:true, maintainAspectRatio:false,
    scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } }, x:{ grid:{ display:false } } },
    plugins:{ legend:{ display:false } }
  };
  barData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], backgroundColor:'#2dd4bf' }] };

  /** ===== Continuo emocional 0–5 ===== */
  private readonly EMO_NAMES = ['Nervioso','Ansioso','Neutro','Confiado','Motivado','Entusiasta'];
  private bandLabelBySegIndex(i: number){ const a=this.EMO_NAMES[i], b=this.EMO_NAMES[i+1]; return `${a} → ${b}`; }
  private betweenLabelFromRaw(raw: number){ const i = Math.min(4, Math.max(0, Math.floor(raw))); return `Entre ${this.EMO_NAMES[i]} y ${this.EMO_NAMES[i+1]}`; }

  /* ================== Gauge ================== */
  showInfo = false;
  levelColor = '#14b8a6';
  gaugePlugins: Plugin[] = [GaugePointerPlugin as unknown as Plugin];
  private readonly SEGMENTS = [20, 20, 20, 20, 20];

  private readonly LEVELS = [
    { key:'nivel1', name:'Muy tenso',          min:  0, max: 20, color:'#ef4444', pale:'rgba(239, 68, 68, 0.35)', desc:'Alto nivel de tensión.', advice:'Respira y practica pausas.' },
    { key:'nivel2', name:'Ansiedad baja/mod.', min: 20, max: 40, color:'#f97316', pale:'rgba(249, 115, 22, 0.35)', desc:'Algo de inquietud.', advice:'Baja el ritmo y enfoca ideas.' },
    { key:'nivel3', name:'Neutro',             min: 40, max: 60, color:'#f59e0b', pale:'rgba(245, 158, 11, 0.35)', desc:'Estable, balanceado.', advice:'Añade energía positiva.' },
    { key:'nivel4', name:'Confiado',           min: 60, max: 80, color:'#14b8a6', pale:'rgba(20, 184, 166, 0.35)', desc:'Buena confianza.', advice:'Mantén contacto visual.' },
    { key:'nivel5', name:'Alta motivación',    min: 80, max:100, color:'#22c55e', pale:'rgba(34, 197, 94, 0.35)', desc:'Muy positivo y dinámico.', advice:'Cuida la claridad y ritmo.' }
  ];

  gaugeOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    rotation: -90,
    circumference: 180,
    cutout: '81%',
    layout: { padding: 2 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true, mode: 'nearest', intersect: false, displayColors: true,
        callbacks: {
          title: (items: TooltipItem<'doughnut'>[]) => {
            const it = items?.[0];
            if (!it) return '';
            if (it.datasetIndex === 0) return `Nivel ${it.dataIndex + 1} · ${this.bandLabelBySegIndex(it.dataIndex)}`;
            if (it.datasetIndex === 1 && it.dataIndex === 0) return this.betweenLabel;
            return '';
          },
          label: (ctx: TooltipItem<'doughnut'>) => {
            if (ctx.datasetIndex === 0) {
              const L = this.LEVELS[ctx.dataIndex];
              return L ? `${L.min}–${L.max}%` : '';
            }
            if (ctx.datasetIndex === 1 && ctx.dataIndex === 0) return `Progreso: ${this.scorePercent.toFixed(1)}%`;
            return '';
          }
        }
      }
    },
    animation: { animateRotate: true, duration: 700, easing: 'easeOutQuart' }
  };

  gaugeData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  // Métricas generales
  avgScore = 0;
  bestScore = 0;

  // —— Emoción más frecuente
  topEmotionLabel = '';
  topEmotionCount = 0;
  topEmotionTie = false;
  topEmotionTiedWith: string[] = [];
  topEmotionTiebreak: 'confianza' | 'recencia' | '' = '';
  topEmotionConfidenceNote = '';
  kpiInfoOpen = false;

  // Gauge (usa promedio CRUDO)
  avgRaw = 0; scorePercent = 0; scoreLevel = '—'; levelIndex = 0;
  withinLevelPct = 0; toNextPct = 0; deltaPct = 0; deltaLevels = 0;
  private firstPct = 0; private lastPct = 0;
  betweenLabel = '';

  // Tendencias
  totalDeltaPct = 0; totalDeltaLevels = 0; recentDeltaPct = 0; recentDeltaLevels = 0;
  formatSigned(n: number){ return (n>0?`+${n}`:`${n}`); }

  // Periodo de barras
  periodPreset: '7d'|'30d'|'6m'|'1y'|'custom' = '30d';
  customStart = '';  // yyyy-MM-dd
  customEnd = '';    // yyyy-MM-dd

  // Mapeo etiquetas UI
  private readonly EMO_LABELS: Record<string, string> = {
    confiada:'Confiada', ansiosa:'Ansiosa', entusiasta:'Entusiasta',
    motivada:'Motivada', nerviosa:'Nerviosa', neutra:'Neutra'
  };

  private summaries: Presentation[] = [];

  ngOnInit(): void {
    this.presentationService.getPresentationSummaries().subscribe({
      next: (data: Presentation[]) => {
        const sorted = [...data].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        this.summaries = sorted;
        this.totalPresentations = sorted.length;

        // Últimas
        this.presentations = [...sorted].reverse().slice(0,6).map(p => ({
          id: p.id, title: p.filename, date: this.timeAgo(p.created_at),
          image: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/66a23e2154e5e054fff4f169_outline_blog.jpg'
        }));

        // Línea y gauge
        forkJoin(sorted.map(p => this.presentationService.getPresentationById(p.id)))
          .subscribe(details => {
            // Línea
            const labels = sorted.map(p => this.shortDate(p.created_at));
            const lineScores = details.map((d, i) => {
              const probs = (d?.emotion_probabilities ?? {}) as Record<string, number>;
              return Object.keys(probs).length
                ? computeEmotionScore(probs, true, true)
                : this.fallbackStarsByDominant(sorted[i]);
            });
            this.lineData = { labels, datasets: [{ data: lineScores, borderColor:'#00bfa6', pointRadius:3 }] };
            this.avgScore = this.round1(lineScores.reduce((s,n)=>s+n,0) / (lineScores.length || 1));
            this.bestScore = this.round1(Math.max(...lineScores, 0));

            // Gauge
            const raws = details.map((d, i) => {
              const probs = (d?.emotion_probabilities ?? {}) as Record<string, number>;
              return Object.keys(probs).length
                ? computeEmotionScore(probs, false, false)
                : this.rawByDominant(sorted[i].dominant_emotion);
            });
            this.avgRaw = raws.reduce((s,n)=>s+n,0) / (raws.length || 1);
            this.scorePercent = this.round1((this.avgRaw / 5) * 100);
            this.levelIndex   = Math.min(5, Math.max(1, Math.floor(this.avgRaw) + 1));
            this.scoreLevel   = this.LEVELS[this.levelIndex - 1].name;
            this.withinLevelPct = Math.round((this.avgRaw - Math.floor(this.avgRaw)) * 100);
            this.toNextPct      = 100 - this.withinLevelPct;
            this.betweenLabel = this.betweenLabelFromRaw(this.avgRaw);
            this.buildGauge(this.scorePercent);

            // Tendencias
            const n = raws.length;
            if (n >= 1) {
              const firstRaw = raws[0], lastRaw = raws[n - 1];
              const firstPct = (firstRaw / 5) * 100, lastPct = (lastRaw / 5) * 100;
              this.totalDeltaPct = Math.round(lastPct - firstPct);
              const firstIdx = Math.min(5, Math.max(1, Math.floor(firstRaw) + 1));
              const lastIdx  = Math.min(5, Math.max(1, Math.floor(lastRaw) + 1));
              this.totalDeltaLevels = lastIdx - firstIdx;

              if (n >= 2) {
                const prevRaw = raws[n - 2], prevPct = (prevRaw / 5) * 100;
                this.recentDeltaPct = Math.round(lastPct - prevPct);
                const prevIdx = Math.min(5, Math.max(1, Math.floor(prevRaw) + 1));
                this.recentDeltaLevels = lastIdx - prevIdx;
              }
            }

            // Emoción top (X/Y + desempate)
            const top = this.computeTopEmotionWithConfidence(sorted, details);
            this.topEmotionLabel = top.label;
            this.topEmotionCount = top.count;
            this.topEmotionTie = top.tie;
            this.topEmotionTiedWith = top.tiedWith;
            this.topEmotionTiebreak = top.tiebreak;
            this.topEmotionConfidenceNote = top.confNote;

            // Barras iniciales
            this.refreshBars();
          });
      },
      error: err => console.error('Error loading presentations:', err)
    });
  }

  /* === Gauge builder === */
  private buildGauge(percent: number){
    const p = Math.max(0, Math.min(100, percent));
    const L = this.LEVELS.find(l => p < l.max) || this.LEVELS[this.LEVELS.length - 1];
    this.levelColor = L.color;

    this.gaugeData = {
      labels: [...this.LEVELS.map(l => l.name), 'Progreso', 'Resto'],
      datasets: [
        {
          data: this.SEGMENTS,
          backgroundColor: this.LEVELS.map(l => l.pale),
          hoverBackgroundColor: this.LEVELS.map(l => l.pale),
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.06)',
          spacing: 6,
          weight: 0.9
        } as any,
        {
          data: [p, 100 - p],
          backgroundColor: [L.color, 'rgba(148,163,184,0.30)'],
          hoverBackgroundColor: [L.color, 'rgba(148,163,184,0.30)'],
          borderWidth: 0,
          borderRadius: 14,
          spacing: 0,
          weight: 1.25
        } as any
      ]
    };

    this.setPointer(p, L.color);
  }

  private setPointer(percent: number, color: string){
    (this.gaugeOptions.plugins as any).gaugePointer = { show: true, percent, color };
  }

  /* ====== Barras: lógica de periodos ====== */
  onPeriodChange(){
    if (this.periodPreset === 'custom') {
      const end = new Date();
      const start = new Date(); start.setDate(end.getDate() - 30);
      this.customStart = this.toYMD(start);
      this.customEnd   = this.toYMD(end);
    }
    this.refreshBars();
  }
  onCustomRangeChange(){ if (this.periodPreset==='custom') this.refreshBars(); }

  private refreshBars(){
    if (!this.summaries.length){
      this.barData = { labels: [], datasets: [{ data: [], backgroundColor:'#2dd4bf' }] };
      return;
    }

    let start: Date, end: Date, gran: 'day'|'week'|'month'|'quarter';
    const today = new Date();

    if (this.periodPreset === '7d'){
      end = this.endOfDay(today);
      start = this.startOfDay(new Date(today)); start.setDate(start.getDate()-6);
      gran = 'day';
    } else if (this.periodPreset === '30d'){
      end = this.endOfDay(today);
      start = this.startOfDay(new Date(today)); start.setDate(start.getDate()-29);
      gran = 'week';
    } else if (this.periodPreset === '6m'){
      end = this.endOfDay(today);
      start = this.firstOfMonth(new Date(today.getFullYear(), today.getMonth()-5, 1));
      gran = 'month';
    } else if (this.periodPreset === '1y'){
      end = this.endOfDay(today);
      start = this.firstOfMonth(new Date(today.getFullYear(), today.getMonth()-11, 1));
      gran = 'month';
    } else {
      if (!this.customStart || !this.customEnd) return;
      start = this.startOfDay(new Date(this.customStart));
      end   = this.endOfDay(new Date(this.customEnd));
      const days = Math.max(1, Math.ceil((end.getTime()-start.getTime())/86400000));
      if (days <= 14) gran = 'day';
      else if (days <= 90) gran = 'week';
      else if (days <= 540) gran = 'month';
      else gran = 'quarter';
    }

    const { labels, counts } = this.groupPresentations(this.summaries, start, end, gran);
    this.barData = { labels, datasets: [{ data: counts, backgroundColor:'#2dd4bf' }] };
  }

  // ==== NUEVOS helpers de formato ====
  private fmtDay(d: Date){ return String(d.getDate()).padStart(2,'0'); }
  private fmtMon(d: Date){ return d.toLocaleString('es-PE',{ month:'short'}).replace('.',''); }
  /** Etiqueta “02–08 sep” o “28 jul–03 ago” si cruza de mes */
  private weekRangeLabel(start: Date){
    const s = new Date(start);
    const e = new Date(start); e.setDate(e.getDate()+6);
    const sd = this.fmtDay(s), ed = this.fmtDay(e);
    const sm = this.fmtMon(s), em = this.fmtMon(e);
    return sm === em ? `${sd}–${ed} ${em}` : `${sd} ${sm}–${ed} ${em}`;
  }

  private groupPresentations(list: Presentation[], start: Date, end: Date, gran: 'day'|'week'|'month'|'quarter'){
    const labels: string[] = [];
    const keys: string[] = [];
    const counts: number[] = [];

    const pushBucket = (key: string, label: string) => {
      keys.push(key); labels.push(label); counts.push(0);
    };

    if (gran === 'day'){
      const cur = new Date(start);
      while (cur <= end){
        const key = this.toYMD(cur);
        const label = cur.toLocaleDateString('es-PE',{ day:'2-digit', month:'short'}).replace('.','');
        pushBucket(key, label);
        cur.setDate(cur.getDate()+1);
      }
    } else if (gran === 'week'){
      // Semana (lunes) con rango “02–08 sep”
      const w = this.startOfWeek(new Date(start));
      while (w <= end){
        const key = 'W'+this.toYMD(w);
        const label = this.weekRangeLabel(w);
        pushBucket(key, label);
        w.setDate(w.getDate()+7);
      }
    } else if (gran === 'month'){
      // Solo el nombre del mes (sin año)
      const m = this.firstOfMonth(new Date(start.getFullYear(), start.getMonth(), 1));
      while (m <= end){
        const key = m.getFullYear()+'-'+(m.getMonth()+1);
        const label = this.fmtMon(m); // “ene”, “feb”, …
        pushBucket(key, label);
        m.setMonth(m.getMonth()+1);
      }
    } else { // quarter
      const q = this.firstOfQuarter(new Date(start.getFullYear(), start.getMonth(), 1));
      while (q <= end){
        const qNum = Math.floor(q.getMonth()/3)+1;
        const label = `T${qNum}`;
        const key = `Q${q.getFullYear()}-${qNum}`;
        pushBucket(key, label);
        q.setMonth(q.getMonth()+3);
      }
    }

    // Conteo
    for (const p of list){
      const d = new Date(p.created_at);
      if (d < start || d > end) continue;

      let key = '';
      if (gran === 'day'){
        key = this.toYMD(this.startOfDay(d));
      } else if (gran === 'week'){
        key = 'W'+this.toYMD(this.startOfWeek(d));
      } else if (gran === 'month'){
        const mm = new Date(d.getFullYear(), d.getMonth(), 1);
        key = mm.getFullYear()+'-'+(mm.getMonth()+1);
      } else {
        const qq = this.firstOfQuarter(new Date(d.getFullYear(), d.getMonth(), 1));
        const qNum = Math.floor(qq.getMonth()/3)+1;
        key = `Q${qq.getFullYear()}-${qNum}`;
      }

      const idx = keys.indexOf(key);
      if (idx >= 0) counts[idx] += 1;
    }

    return { labels, counts };
  }

  /* ================== Lógica de scores ================== */
  private fallbackStarsByDominant(p: Presentation): number {
    const dom = (p.dominant_emotion || 'neutra').toLowerCase();
    const anchor: Record<string, number> = {
      nerviosa: 1, ansiosa: 2, neutra: 2, confiada: 3, motivada: 4, entusiasta: 5
    };
    return anchor[dom] ?? 2;
  }

  private rawByDominant(dom?: string) {
    const anchorRaw: Record<string, number> = {
      nerviosa: 0, ansiosa: 1, neutra: 2, confiada: 3, motivada: 4, entusiasta: 5
    };
    return anchorRaw[(dom || 'neutra').toLowerCase()] ?? 2;
  }

  /** Top emoción por conteo; desempate por confianza promedio; si persiste/ausente, por recencia */
  private computeTopEmotionWithConfidence(sorted: Presentation[], details: any[]){
    const count: Record<string, number> = {};
    const sumConf: Record<string, number> = {};
    const nConf: Record<string, number> = {};
    const lastIndex: Record<string, number> = {};

    for (let i = 0; i < sorted.length; i++){
      const dom = (sorted[i].dominant_emotion || 'neutra').toLowerCase();
      count[dom] = (count[dom] || 0) + 1;
      lastIndex[dom] = i;

      const probs = (details[i]?.emotion_probabilities ?? {}) as Record<string, number>;
      const conf = typeof probs[dom] === 'number' ? probs[dom] : undefined;
      if (typeof conf === 'number'){
        sumConf[dom] = (sumConf[dom] || 0) + conf;
        nConf[dom] = (nConf[dom] || 0) + 1;
      }
    }

    if (!sorted.length){
      return { label: '—', count: 0, tie: false, tiedWith: [] as string[], tiebreak: '' as const, confNote: '' };
    }

    let maxCount = 0;
    for (const v of Object.values(count)) if (v > maxCount) maxCount = v;
    const candidates = Object.keys(count).filter(k => count[k] === maxCount);

    if (candidates.length === 1){
      const k = candidates[0];
      return { label: this.EMO_LABELS[k] || k, count: maxCount, tie: false, tiedWith: [], tiebreak: '' as const, confNote: '' };
    }

    // Empate → confianza promedio
    let bestByConf = ''; let bestAvg = -1; let hasAnyConf = false;
    const avgBy: Record<string, number> = {};
    for (const k of candidates){
      if (nConf[k] > 0){
        hasAnyConf = true;
        const avg = sumConf[k] / nConf[k];
        avgBy[k] = avg;
        if (avg > bestAvg){ bestAvg = avg; bestByConf = k; }
      }
    }

    if (hasAnyConf){
      const topPeers = Object.entries(avgBy).filter(([_, v]) => v === bestAvg).map(([k]) => k);
      if (topPeers.length === 1){
        const k = bestByConf;
        const tiedWith = candidates.filter(x => x !== k).map(x => this.EMO_LABELS[x] || x);
        let confNote = '';
        if (candidates.length === 2){
          const other = candidates.find(x => x !== k)!;
          confNote = `${(avgBy[k]).toFixed(2)} vs ${(avgBy[other] ?? 0).toFixed(2)}`;
        } else {
          confNote = `${(avgBy[k]).toFixed(2)}`;
        }
        return { label: this.EMO_LABELS[k] || k, count: maxCount, tie: true, tiedWith, tiebreak: 'confianza' as const, confNote };
      }
    }

    // Fallback: recencia
    let bestByRecency = candidates[0];
    for (const k of candidates){
      if ((lastIndex[k] ?? -1) > (lastIndex[bestByRecency] ?? -1)) bestByRecency = k;
    }
    const tiedWith = candidates.filter(x => x !== bestByRecency).map(x => this.EMO_LABELS[x] || x);
    return { label: this.EMO_LABELS[bestByRecency] || bestByRecency, count: maxCount, tie: true, tiedWith, tiebreak: 'recencia' as const, confNote: '' };
  }

  /* ===== Helpers de fechas ===== */
  private toYMD(d: Date){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  private startOfDay(d: Date){ d.setHours(0,0,0,0); return d; }
  private endOfDay(d: Date){ d.setHours(23,59,59,999); return d; }
  private startOfWeek(d: Date){ // lunes
    const x = new Date(d); x.setHours(0,0,0,0);
    const day = x.getDay(); // 0..6 (0=dom)
    const diff = (day === 0 ? -6 : 1 - day);
    x.setDate(x.getDate()+diff);
    return x;
  }
  private firstOfMonth(d: Date){ const x=new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; }
  private firstOfQuarter(d: Date){ const q = Math.floor(d.getMonth()/3)*3; const x=new Date(d.getFullYear(), q, 1); x.setHours(0,0,0,0); return x; }

  /* ===== util UI ===== */
  timeAgo(dateStr:string){
    const d=new Date(dateStr), n=new Date();
    const days=Math.floor((n.getTime()-d.getTime())/(1000*60*60*24));
    if (days<=0) return 'Hoy';
    if (days===1) return 'Hace 1 día';
    return `Hace ${days} días`;
  }
  private shortDate(dateStr:string){
    const d=new Date(dateStr);
    return d.toLocaleDateString('es-PE', { month:'short', day:'2-digit' }).replace('.','');
  }
  private round1(n:number){ return Math.round(n*10)/10; }

  goToUpload(){ this.router.navigate(['/presentations']); }
  goToDetails(){ this.router.navigate(['/presentations']); }
  goToHistory(){ this.router.navigate(['/presentations']); }
  goToFeedbackConfig(id:string){ this.router.navigate(['/design/feedback-config', id]); }
}