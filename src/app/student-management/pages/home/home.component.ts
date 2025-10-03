import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    const meta = chart.getDatasetMeta(1); // dataset de progreso [p, 100-p]
    if (!meta?.data?.length) return;

    const arc: any = meta.data[0]; // primer slice = progreso
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

  /** ===== Continuo emocional 0–5 (pares de emociones por tramo) =====
   *  0–1: Nervioso→Ansioso
   *  1–2: Ansioso→Neutro
   *  2–3: Neutro→Confiado
   *  3–4: Confiado→Motivado
   *  4–5: Motivado→Entusiasta
   */
  private readonly EMO_NAMES = ['Nervioso','Ansioso','Neutro','Confiado','Motivado','Entusiasta'];

  /** Devuelve: índice entero 0..4 del segmento (20% c/u) según un % [0..100] */
  private segIndexFromPercent(p: number){ return Math.min(4, Math.max(0, Math.floor(p / 20))); }

  /** Label “Nervioso → Ansioso”, “Ansioso → Neutro”, etc. para un segmento 0..4 */
  private bandLabelBySegIndex(i: number){
    const a = this.EMO_NAMES[i];
    const b = this.EMO_NAMES[i+1];
    return `${a} → ${b}`;
  }

  /** Para un promedio crudo 0..5, devuelve “Entre Neutro y Confiado” */
  private betweenLabelFromRaw(raw: number){
    const i = Math.min(4, Math.max(0, Math.floor(raw))); // 0..4
    const a = this.EMO_NAMES[i];
    const b = this.EMO_NAMES[i+1];
    return `Entre ${a} y ${b}`;
  }

  /* ================== Gauge por niveles (5 niveles) ================== */
  showInfo = false;
  levelColor = '#14b8a6';
  gaugePlugins: Plugin[] = [GaugePointerPlugin as unknown as Plugin];

  // 5 segmentos iguales (20% c/u)
  private readonly SEGMENTS = [20, 20, 20, 20, 20];

  // Definición de niveles (1..5)
  private readonly LEVELS = [
    { key:'nivel1', name:'Muy tenso',          min:  0, max: 20,
      color:'#ef4444', pale:'rgba(239, 68, 68, 0.35)',
      desc:'Alto nivel de tensión.', advice:'Respira y practica pausas.' },

    { key:'nivel2', name:'Ansiedad baja/mod.', min: 20, max: 40,
      color:'#f97316', pale:'rgba(249, 115, 22, 0.35)',
      desc:'Algo de inquietud.', advice:'Baja el ritmo y enfoca ideas.' },

    { key:'nivel3', name:'Neutro',             min: 40, max: 60,
      color:'#f59e0b', pale:'rgba(245, 158, 11, 0.35)',
      desc:'Estable, balanceado.', advice:'Añade energía positiva.' },

    { key:'nivel4', name:'Confiado',           min: 60, max: 80,
      color:'#14b8a6', pale:'rgba(20, 184, 166, 0.35)',
      desc:'Buena confianza.', advice:'Mantén contacto visual.' },

    { key:'nivel5', name:'Alta motivación',    min: 80, max:100,
      color:'#22c55e', pale:'rgba(34, 197, 94, 0.35)',
      desc:'Muy positivo y dinámico.', advice:'Cuida la claridad y ritmo.' }
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
        enabled: true,
        mode: 'nearest',
        intersect: false,
        displayColors: true,
        callbacks: {
          title: (items: TooltipItem<'doughnut'>[]) => {
            const it = items?.[0];
            if (!it) return '';
            // Fondo segmentado: mostrar nivel + banda
            if (it.datasetIndex === 0) {
              return `Nivel ${it.dataIndex + 1} · ${this.bandLabelBySegIndex(it.dataIndex)}`;
            }
            // Arco de progreso: mostrar banda actual según avgRaw
            if (it.datasetIndex === 1 && it.dataIndex === 0) {
              return this.betweenLabel;
            }
            return '';
          },
          label: (ctx: TooltipItem<'doughnut'>) => {
            if (ctx.datasetIndex === 0) {
              const L = this.LEVELS[ctx.dataIndex];
              return L ? `${L.min}–${L.max}%` : '';
            }
            if (ctx.datasetIndex === 1 && ctx.dataIndex === 0) {
              return `Progreso: ${this.scorePercent.toFixed(1)}%`;
            }
            return '';
          }
        }
      }
    },
    animation: { animateRotate: true, duration: 700, easing: 'easeOutQuart' }
  };

  gaugeData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  // Métricas generales
  avgScore = 0;                   // promedio de estrellas redondeadas (línea)
  bestScore = 0;
  topEmotionLabel = ''; topEmotionPct = 0;

  // Gauge (usa promedio CRUDO)
  avgRaw = 0;                     // 0..5 sin redondeos
  scorePercent = 0;               // 0..100
  scoreLevel   = '—';
  levelIndex   = 0;               // 1..5
  withinLevelPct = 0;             // 0..100 dentro del nivel
  toNextPct = 0;                  // % restante para subir de nivel
  deltaPct = 0;                   // cambio pp vs. primera
  deltaLevels = 0;                // cambio en niveles
  private firstPct = 0;           // % primera (crudo)
  private lastPct = 0;            // % última (crudo)

  // NUEVO: texto “Entre A y B” para el overlay central y tooltips
  betweenLabel = '';

  // —— Tendencias (nuevo) ——
  totalDeltaPct = 0;       // pp: primera -> última
  totalDeltaLevels = 0;

  recentDeltaPct = 0;      // pp: penúltima -> última
  recentDeltaLevels = 0;

  formatSigned(n: number){ return (n>0?`+${n}`:`${n}`); }


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

        // Barras por mes
        const { mLabels, mCounts } = this.countByMonth(sorted, 6);
        this.barData = { labels: mLabels, datasets: [{ data: mCounts, backgroundColor:'#2dd4bf' }] };

        // Cargar detalles (para emotion_probabilities)
        forkJoin(sorted.map(p => this.presentationService.getPresentationById(p.id)))
          .subscribe(details => {
            // 1) Línea: estrellas visuales (redondeadas a .5)
            const labels = sorted.map(p => this.shortDate(p.created_at));
            const lineScores = details.map((d, i) => {
              const probs = (d?.emotion_probabilities ?? {}) as Record<string, number>;
              return Object.keys(probs).length
                ? computeEmotionScore(probs, true, true)   // .5 + clamp
                : this.fallbackStarsByDominant(sorted[i]);
            });
            this.lineData = { labels, datasets: [{ data: lineScores, borderColor:'#00bfa6', pointRadius:3 }] };
            this.avgScore = this.round1(lineScores.reduce((s,n)=>s+n,0) / (lineScores.length || 1));
            this.bestScore = this.round1(lineScores.reduce((m,n)=>Math.max(m,n),0));

            // 2) Gauge: PROMEDIO CRUDO exacto (0..5)
            const raws = details.map((d, i) => {
              const probs = (d?.emotion_probabilities ?? {}) as Record<string, number>;
              return Object.keys(probs).length
                ? computeEmotionScore(probs, false, false) // crudo 0..5
                : this.rawByDominant(sorted[i].dominant_emotion);
            });

            this.avgRaw = raws.reduce((s,n)=>s+n,0) / (raws.length || 1);   // 0..5
            this.scorePercent = this.round1((this.avgRaw / 5) * 100);       // 0..100
            this.levelIndex   = Math.min(5, Math.max(1, Math.floor(this.avgRaw) + 1));
            this.scoreLevel   = this.LEVELS[this.levelIndex - 1].name;
            this.withinLevelPct = Math.round((this.avgRaw - Math.floor(this.avgRaw)) * 100);
            this.toNextPct      = 100 - this.withinLevelPct;

            // NUEVO: texto “Entre A y B”
            this.betweenLabel = this.betweenLabelFromRaw(this.avgRaw);

            // Construir gauge
            this.buildGauge(this.scorePercent);

            // 3) Evolución: total (primera vs última) y reciente (penúltima vs última)
            const n = raws.length;
            if (n >= 1) {
              const firstRaw = raws[0];
              const lastRaw  = raws[n - 1];

              // Progreso total
              const firstPct = (firstRaw / 5) * 100;
              const lastPct  = (lastRaw  / 5) * 100;
              this.totalDeltaPct = Math.round(lastPct - firstPct);

              const firstIdx = Math.min(5, Math.max(1, Math.floor(firstRaw) + 1));
              const lastIdx  = Math.min(5, Math.max(1, Math.floor(lastRaw) + 1));
              this.totalDeltaLevels = lastIdx - firstIdx;

              // Tendencia reciente (penúltima -> última)
              if (n >= 2) {
                const prevRaw = raws[n - 2];
                const prevPct = (prevRaw / 5) * 100;

                this.recentDeltaPct = Math.round(lastPct - prevPct);

                const prevIdx = Math.min(5, Math.max(1, Math.floor(prevRaw) + 1));
                this.recentDeltaLevels = lastIdx - prevIdx;
              } else {
                this.recentDeltaPct = 0;
                this.recentDeltaLevels = 0;
              }
            } else {
              this.totalDeltaPct = 0;
              this.totalDeltaLevels = 0;
              this.recentDeltaPct = 0;
              this.recentDeltaLevels = 0;
            }

            // 4) Emoción más frecuente (según summaries)
            const dist = this.emotionDistribution(sorted);
            const [topKey, topPct] = this.topEmotion(dist);
            const EMO_LABELS: Record<string,string> = {
              confiada:'Confiada', ansiosa:'Ansiosa', entusiasta:'Entusiasta',
              motivada:'Motivada', nerviosa:'Nerviosa', neutra:'Neutra'
            };
            this.topEmotionLabel = EMO_LABELS[topKey] || topKey || '—';
            this.topEmotionPct = Math.round(topPct);
          });
      },
      error: err => console.error('Error loading presentations:', err)
    });
  }

  /* === Gauge builder por niveles === */
  private buildGauge(percent: number){
    const p = Math.max(0, Math.min(100, percent));
    const L = this.LEVELS.find(l => p < l.max) || this.LEVELS[this.LEVELS.length - 1];
    this.levelColor = L.color;

    this.gaugeData = {
      labels: [...this.LEVELS.map(l => l.name), 'Progreso', 'Resto'],
      datasets: [
        // Fondo segmentado (niveles)
        {
          data: this.SEGMENTS,
          backgroundColor: this.LEVELS.map(l => l.pale),
          hoverBackgroundColor: this.LEVELS.map(l => l.pale),
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.06)',
          spacing: 6,
          weight: 0.9
        } as any,
        // Progreso real
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

  /** Inyecta la config del plugin 'gaugePointer' */
  private setPointer(percent: number, color: string){
    (this.gaugeOptions.plugins as any).gaugePointer = {
      show: true,
      percent,
      color
    };
  }

  /* ================== Lógica de scores ================== */
  private fallbackStarsByDominant(p: Presentation): number {
    const dom = (p.dominant_emotion || 'neutra').toLowerCase();
    const anchor: Record<string, number> = {
      nerviosa: 1, ansiosa: 2, neutra: 2, confiada: 3, motivada: 4, entusiasta: 5
    };
    return anchor[dom] ?? 2;
  }

  private rawScoreFromPresentation(p: Presentation): number {
    const probs = (p as any).emotion_probabilities as Record<string, number> | undefined;
    if (probs && Object.keys(probs).length) {
      return computeEmotionScore(probs, false, false);
    }
    const dom = (p.dominant_emotion || 'neutra').toLowerCase();
    const anchorRaw: Record<string, number> = {
      nerviosa: 0, ansiosa: 1, neutra: 2, confiada: 3, motivada: 4, entusiasta: 5
    };
    return anchorRaw[dom] ?? 2;
  }

  /* ================== Helpers previos ================== */
  private rawByDominant(dom?: string) {
    const anchorRaw: Record<string, number> = {
      nerviosa: 0, ansiosa: 1, neutra: 2, confiada: 3, motivada: 4, entusiasta: 5
    };
    return anchorRaw[(dom || 'neutra').toLowerCase()] ?? 2;
  }

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
