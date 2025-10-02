import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PresentationService } from '../../services/presentation.service';
import { Presentation } from '../../models/presentation.model';

import { NgChartsModule } from 'ng2-charts';
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  BarElement, ArcElement, Tooltip, Legend, Filler,
  ChartOptions, ChartData, Plugin
} from 'chart.js';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, BarElement, ArcElement, Tooltip, Legend, Filler);

/** ===== Plugin Chart.js para dibujar el puntero (knob) en el borde del gauge ===== */
const GaugePointerPlugin = {
  id: 'gaugePointer',
  afterDraw(chart: any, _args: any, opts: any) {
    if (!opts?.show || typeof opts.percent !== 'number') return;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;

    const arc: any = meta.data[0];
    const cx = arc.x, cy = arc.y;
    const inner = arc.innerRadius;
    const outer = arc.outerRadius;

    // -90° a +90° (semicírculo superior)
    const startDeg = -90;
    const angleDeg = startDeg + (opts.percent / 100) * 180;
    const angle = (angleDeg * Math.PI) / 180;

    // Punto en borde superior del arco
    const r = (inner + outer) / 2 + (outer - inner) / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = opts.color || '#0ea5e9';
    ctx.shadowColor = 'rgba(0,0,0,.12)';
    ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.restore();
  }
};
Chart.register(GaugePointerPlugin as any);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
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

  // Barras
  barOptions: ChartOptions<'bar'> = {
    responsive:true, maintainAspectRatio:false,
    scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } }, x:{ grid:{ display:false } } },
    plugins:{ legend:{ display:false } }
  };
  barData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], backgroundColor:'#2dd4bf' }] };

  /* ================== Gauge por niveles (solo %) ================== */
  showInfo = false;
  levelColor = '#14b8a6';
  gaugePlugins: Plugin[] = [GaugePointerPlugin as unknown as Plugin];

  // Segmentos que suman 100 (según rangos de nivel)
  private readonly SEGMENTS = [15, 15, 20, 25, 10, 15]; // Nerviosa..Entusiasta
  private readonly LEVELS = [
    { key:'nerviosa',   name:'Nerviosa',   min:  0, max: 15, color:'#ef4444', pale:'rgba(239,68,68,.18)',  desc:'Alto nivel de nervios.',   advice:'Respira y practica pausas.' },
    { key:'ansiosa',    name:'Ansiosa',    min: 15, max: 30, color:'#f87171', pale:'rgba(248,113,113,.18)',desc:'Ansiedad perceptible.',     advice:'Baja el ritmo y enfoca ideas.' },
    { key:'neutra',     name:'Neutra',     min: 30, max: 50, color:'#f59e0b', pale:'rgba(245,158,11,.18)', desc:'Estable, sin sesgo.',       advice:'Añade energía positiva.' },
    { key:'confiada',   name:'Confiada',   min: 50, max: 75, color:'#14b8a6', pale:'rgba(20,184,166,.18)', desc:'Confianza sostenida.',     advice:'Mantén contacto visual.' },
    { key:'motivada',   name:'Motivada',   min: 75, max: 85, color:'#06b6d4', pale:'rgba(6,182,212,.18)',  desc:'Alta motivación.',         advice:'Estructura mensajes clave.' },
    { key:'entusiasta', name:'Entusiasta', min: 85, max:100, color:'#22c55e', pale:'rgba(34,197,94,.18)',  desc:'Muy positiva.',            advice:'Cuida la claridad y ritmo.' }
  ];

  gaugeOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    rotation: -90,
    circumference: 180,
    cutout: '86%',
    layout: { padding: 2 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (ctx: any) => {
            const i = ctx.dataIndex;
            const L = this.LEVELS[i];
            if (!L) return '';
            const minPct = Math.round(L.min);
            const maxPct = Math.round(L.max);
            return `${L.name}: ${minPct}–${maxPct}% · ${L.desc} — ${L.advice}`;
          }
        }
      }
    },
    animation: { animateRotate: true, duration: 700, easing: 'easeOutQuart' }
  };

  gaugeData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  // Métricas generales
  avgScore = 0; bestScore = 0; topEmotionLabel = ''; topEmotionPct = 0;

  // Gauge (solo % y nivel)
  scorePercent = 0;        // 0..100
  scoreLevel   = '—';
  levelIndex   = 0;        // 1..6
  withinLevelPct = 0;      // 0..100 dentro del nivel
  toNextPct = 0;           // % restante para subir de nivel
  deltaPct = 0;            // cambio en puntos porcentuales vs. primera
  deltaLevels = 0;         // cambio en niveles
  private firstPct = 0;    // % primera presentación
  private lastPct = 0;     // % última presentación

  // Etiquetas & scoring (para línea/promedios)
  private readonly POS = new Set(['confiada','motivada','entusiasta']);
  private readonly NEG = new Set(['ansiosa','nerviosa']);
  private readonly EMO_LABELS: Record<string,string> = {
    confiada:'Confiada', ansiosa:'Ansiosa', entusiasta:'Entusiasta',
    motivada:'Motivada', nerviosa:'Nerviosa', neutra:'Neutra'
  };
  private readonly EMO_POINTS: Record<string, number> = {
    entusiasta: 2, motivada: 1, confiada: 1, ansiosa: 0, neutra: 0, nerviosa: -1
  };

  ngOnInit(): void {
    this.presentationService.getPresentationSummaries().subscribe({
      next: (data: Presentation[]) => {
        const sorted = [...data].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        this.totalPresentations = sorted.length;

        // Últimas
        this.presentations = [...sorted].reverse().slice(0,6).map(p => ({
          id: p.id, title: p.filename, date: this.timeAgo(p.created_at),
          image: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/66a23e2154e5e054fff4f169_outline_blog.jpg'
        }));

        // 1) Línea 0..5
        const labels = sorted.map(p => this.shortDate(p.created_at));
        const scores = sorted.map(p => this.scoreFromPresentation(p));
        this.lineData = { labels, datasets: [{ data: scores, borderColor:'#00bfa6', pointRadius:3 }] };
        this.avgScore = this.round1(scores.reduce((s,n)=>s+n,0) / (scores.length || 1));
        this.bestScore = this.round1(scores.reduce((m,n)=>Math.max(m,n),0));

        // 2) Barras por mes
        const { mLabels, mCounts } = this.countByMonth(sorted, 6);
        this.barData = { labels: mLabels, datasets: [{ data: mCounts, backgroundColor:'#2dd4bf' }] };

        // 3) Gauge: porcentaje → nivel/color
        this.scorePercent = this.round1(this.scorePercentFromPresentations(sorted));
        const { name, idx } = this.levelInfoFromPercent(this.scorePercent);
        this.scoreLevel = name; this.levelIndex = idx;

        // Construir datasets segmentados + puntero
        this.buildGauge(this.scorePercent);

        // Evolución total (primera vs. última) en %
        if (sorted.length >= 1) {
          this.firstPct = this.percentFromPresentation(sorted[0]);                    // 0..100
          this.lastPct  = this.percentFromPresentation(sorted[sorted.length - 1]);    // 0..100
          this.deltaPct = Math.round(this.lastPct - this.firstPct);                   // puntos porcentuales
          const firstIdx = this.levelInfoFromPercent(this.firstPct).idx;
          const lastIdx  = this.levelInfoFromPercent(this.lastPct).idx;
          this.deltaLevels = lastIdx - firstIdx;
        } else {
          this.firstPct = this.lastPct = 0;
          this.deltaPct = 0;
          this.deltaLevels = 0;
        }

        // Métricas dentro del nivel y faltante para el siguiente (en %)
        const L = this.LEVELS.find(l => this.scorePercent < l.max) || this.LEVELS[this.LEVELS.length - 1];
        this.withinLevelPct = Math.max(0, Math.min(100, Math.round(((this.scorePercent - L.min) / (L.max - L.min)) * 100)));
        this.toNextPct = Math.max(0, Math.round(L.max - this.scorePercent));

        // “Predomina …”
        const dist = this.emotionDistribution(sorted);
        const [topKey, topPct] = this.topEmotion(dist);
        this.topEmotionLabel = this.EMO_LABELS[topKey] || topKey || '—';
        this.topEmotionPct = Math.round(topPct);
      },
      error: err => console.error('Error loading presentations:', err)
    });
  }

  /* === Gauge builder por niveles === */
  private buildGauge(percent: number){
    // Nivel actual
    const L = this.LEVELS.find(l => percent < l.max) || this.LEVELS[this.LEVELS.length - 1];
    this.levelColor = L.color;

    // Dataset A: fondo segmentado (pálido)
    const bgColors = this.LEVELS.map(l => l.pale);

    // Dataset B: resaltado solo del nivel actual
    const hiValues = this.SEGMENTS.map((v, i) => (this.LEVELS[i].key === L.key ? v : 0));
    const hiColors = this.LEVELS.map((_l, i) => (this.LEVELS[i].key === L.key ? L.color : 'transparent'));

    this.gaugeData = {
      labels: this.LEVELS.map(l => l.name),
      datasets: [
        {
          data: this.SEGMENTS,
          backgroundColor: bgColors,
          hoverBackgroundColor: bgColors,
          borderWidth: 0,
          spacing: 3
        } as any,
        {
          data: hiValues,
          backgroundColor: hiColors,
          hoverBackgroundColor: hiColors,
          borderWidth: 0,
          spacing: 3
        } as any
      ]
    };

    // Inyectar configuración del puntero
    this.setPointer(percent, L.color);
  }

  /** Inyecta la config del plugin 'gaugePointer' */
  private setPointer(percent: number, color: string){
    (this.gaugeOptions.plugins as any).gaugePointer = {
      show: true,
      percent,
      color
    };
  }

  /* === Helpers existentes === */
  private scoreFromPresentation(p: Presentation): number {
    const probs = (p as any).emotion_probabilities as Record<string, number> | undefined;
    if (probs && Object.keys(probs).length) {
      const pos = Object.entries(probs).reduce((s,[k,v]) => s + (this.POS.has(k) ? v : 0), 0);
      const neg = Object.entries(probs).reduce((s,[k,v]) => s + (this.NEG.has(k) ? v : 0), 0);
      const raw01 = Math.min(1, Math.max(0, 0.5 + (pos - neg)));
      return this.round1(raw01 * 5);
    }
    const dom = (p.dominant_emotion || '').toLowerCase();
    const base = this.POS.has(dom) ? 0.8 : this.NEG.has(dom) ? 0.3 : 0.5;
    return this.round1(base * 5);
  }

  private pointsFromPresentation(p: Presentation): number {
    const probs = (p as any).emotion_probabilities as Record<string, number> | undefined;
    if (probs && Object.keys(probs).length) {
      let s = 0;
      for (const [emo, prob] of Object.entries(probs)) s += prob * (this.EMO_POINTS[emo.toLowerCase()] ?? 0);
      return s; // [-1,2]
    }
    const dom = (p.dominant_emotion || 'neutra').toLowerCase();
    return this.EMO_POINTS[dom] ?? 0;
  }

  private percentFromPresentation(p: Presentation): number {
    return ((this.pointsFromPresentation(p) + 1) / 3) * 100; // 0..100
  }

  private scorePercentFromPresentations(list: Presentation[]): number {
    if (!list.length) return 0;
    const avgPts = list.map(x => this.pointsFromPresentation(x)).reduce((a,b)=>a+b,0) / list.length; // [-1,2]
    return ((avgPts + 1) / 3) * 100; // 0..100
  }

  private levelInfoFromPercent(p: number){
    if (p < 15) return { name:'Nerviosa', idx:1 };
    if (p < 30) return { name:'Ansiosa', idx:2 };
    if (p < 50) return { name:'Neutra', idx:3 };
    if (p < 75) return { name:'Confiada', idx:4 };
    if (p < 85) return { name:'Motivada', idx:5 };
    return { name:'Entusiasta', idx:6 };
  }
  private nextBoundaryPercent(p:number){ const T=[15,30,50,75,85,100]; for (const t of T) if (p < t) return t; return 100; }

  private countByMonth(list: Presentation[], months: number){
    const now = new Date(); const labels:string[] = []; const counts:number[] = [];
    for (let i = months-1; i >= 0; i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = d.getFullYear() + '-' + (d.getMonth()+1);
      labels.push(d.toLocaleString('es-PE',{ month:'short'}).replace('.','') + ' ' + (''+d.getFullYear()).slice(2));
      counts.push(list.filter(p => { const pd = new Date(p.created_at); return (pd.getFullYear() + '-' + (pd.getMonth()+1)) === key; }).length);
    }
    return { mLabels: labels, mCounts: counts };
  }

  private emotionDistribution(list: Presentation[]){
    const acc:Record<string,number>={};
    for (const p of list){
      const k=(p.dominant_emotion||'neutra').toLowerCase();
      acc[k]=(acc[k]||0)+1;
    }
    const total=list.length||1;
    Object.keys(acc).forEach(k => acc[k]=(acc[k]/total)*100);
    return acc;
  }
  private topEmotion(dist: Record<string, number>){
    let topK='neutra', topV=0;
    for (const [k,v] of Object.entries(dist)) if (v>topV){ topK=k; topV=v; }
    return [topK, Math.round(topV*10)/10] as [string, number];
  }

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
