import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import html2pdf from 'html2pdf.js';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PresentationService } from '../../../../student-management/services/presentation.service';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NgChartsModule } from 'ng2-charts';
import {
  Chart, ArcElement, Tooltip, Legend,
  ChartOptions, ChartData
} from 'chart.js';

import { computeEmotionScore } from '../../../../shared/emotion-score.util';

Chart.register(ArcElement, Tooltip, Legend);

interface Feedback {
  general_feedback: string;
  confidence_feedback: string;
  anxiety_feedback: string;
  language_feedback: string;
  suggestions: string;
  dominant_emotion: string | null;
  confidence: number | null;                     // 0..1
  emotion_probabilities: { [key: string]: number } | null; // 0..1 por emoción
}

interface LangMetrics {
  total_words: number;
  positive_words: number;
  negative_words: number;
  filler_count: number;
  good_examples: string[];
  bad_examples: string[];
  filler_examples: string[];
  tips: string[];
}

type ResourceLink = {
  title: string;
  url: string;
  note: string;
  tag: 'respiración'|'muletillas'|'estructura'|'ritmo'|'story';
  vendor?: 'youtube'|'blog'|'pdf';
};

@Component({
  selector: 'app-customize-feedback',
  standalone: true,
  imports: [CommonModule, NgChartsModule, RouterModule],
  templateUrl: './customize-feedback.component.html',
  styleUrls: ['./customize-feedback.component.css']
})
export class CustomizeFeedbackComponent implements OnInit {
  
  @ViewChild('reportContent') reportContent!: ElementRef;
  currentDate = new Date();

  showReportForPdf = false;   // 👈 NUEVO

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private presentationService = inject(PresentationService);

  loading = true;
  error = false;

  feedbackData: Feedback | null = null;

  languageBullets: string[] = [];

  // Datos para el gráfico de emociones
  chartProbs: Record<string, number> = {}; // 0..1
  chartDominant: string | null = null;
  chartConfidence01 = 0;                   // 0..1

  // Estrellas y métricas
  starsConfidence = 0; // 1..5
  starsOverall = 0;    // 1..5

  transcript: string | null = null;
  lang: LangMetrics | null = null;

  // UX
  reflectionText = '';
  suggestionsList: string[] = [];
  resourcesList: ResourceLink[] = [];

  // Orden/etiquetas/colores
  readonly emotionsOrder = ['confiada','ansiosa','entusiasta','motivada','nerviosa','neutra'];
  readonly emotionLabels: Record<string,string> = {
    confiada:'Confiada', ansiosa:'Ansiosa', entusiasta:'Entusiasta',
    motivada:'Motivada', nerviosa:'Nerviosa', neutra:'Neutra'
  };
  readonly emotionColors: Record<string,string> = {
    confiada:'#22c55e', ansiosa:'#ef4444', entusiasta:'#06b6d4',
    motivada:'#f59e0b', nerviosa:'#8b5cf6', neutra:'#9ca3af'
  };

  // Donut
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false, cutout: '58%',
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (c) => `${c.label}: ${(c.raw as number).toFixed(1)}%` } }
    }
  };
  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };

  // Nivel
  private readonly EMO_NAMES = ['Nervioso','Ansioso','Neutro','Confiado','Motivado','Entusiasta'];
  levelIndex = 0;
  levelColor = '#14b8a6';
  scorePercent = 0;
  withinLevelPct = 0;
  betweenLabel = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = true; this.loading = false; return; }

    forkJoin({
      detail: this.presentationService.getPresentationById(id),
      feedback: this.presentationService.getFeedbackByPresentationId(id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ detail, feedback }) => {
        // 1) Emociones desde presentation
        this.chartProbs = (detail?.emotion_probabilities ?? {}) as Record<string, number>;
        this.chartDominant = detail?.dominant_emotion ?? null;
        this.chartConfidence01 = Number(detail?.confidence ?? 0);

        // 2) Textos de feedback
        this.feedbackData = feedback ? this.mapFeedback(feedback) : null;

        // NUEVO: parsear language_feedback con guiones como bullets
const rawLang = (this.feedbackData?.language_feedback || '').trim();

// 1) Limpieza defensiva: quitar "Oración 1:", "Oración 2:", etc. y normalizar bullets/dashes
const cleaned = rawLang
  .replace(/Oraci[oó]n\s*\d+\s*:\s*/gi, '')   // quita "Oración n:"
  .replace(/[•–—]/g, '-');                    // normaliza posibles viñetas/dashes a "-"

// 2) Split principal: cada guion indica un bullet
this.languageBullets = cleaned
  .split(/\s*-\s+/)                            // corta " - " o "- "
  .map(s => s.trim())
  .filter(Boolean);

// 3) Fallback: si no hubo suficientes guiones, usa saltos de línea como respaldo
if (this.languageBullets.length < 2) {
  this.languageBullets = cleaned
    .split(/\r?\n+/)
    .map(s => s.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}



        // 3) Transcript y análisis de lenguaje
        this.transcript = (detail?.transcript || '').trim() || null;
        if (this.transcript) this.lang = this.analyzeLanguage(this.transcript);

        // 4) Derivados / UI
        this.starsConfidence = this.confidenceStars(this.chartConfidence01);

        const avgRaw = computeEmotionScore(this.chartProbs, false, false) || 0; // 0..5
        this.starsOverall = computeEmotionScore(this.chartProbs) || 0;         // visual 0..5

        this.scorePercent = Math.max(0, Math.min(100, (avgRaw / 5) * 100));
        this.levelIndex   = Math.min(5, Math.max(1, Math.floor(avgRaw) + 1));
        this.withinLevelPct = Math.round((avgRaw - Math.floor(avgRaw)) * 100);
        this.betweenLabel = this.betweenLabelFromRaw(avgRaw);
        this.levelColor   = this.colorFromLevel(this.levelIndex);

        // 5) Gráfico
        this.buildEmotionDoughnut();

        // 6) Reflexión + ejercicios + recursos
        const anxPct = this.getEmotionPercentage('ansiosa');
        this.reflectionText = this.buildReflection(this.domKey, anxPct);
        this.suggestionsList = this.parseSuggestions(this.feedbackData?.suggestions || '', this.lang);
        this.resourcesList = this.buildResources({
          anxietyPct: anxPct,
          fillers: this.lang?.filler_count ?? 0,
          totalWords: this.lang?.total_words ?? 0,
          dom: this.domKey
        });

        this.loading = false;
      },
      error: _ => { this.error = true; this.loading = false; }
    });
  }

  // Clave segura
  get domKey(): 'confiada' | 'ansiosa' | 'entusiasta' | 'motivada' | 'nerviosa' | 'neutra' {
    return (this.chartDominant ?? 'neutra') as any;
  }

  get domPct(): number { return this.getEmotionPercentage(this.domKey); }

  get dominantClass(): 'good' | 'warn' | 'danger' {
    const k = this.domKey;
    if (k === 'nerviosa' || k === 'ansiosa') return 'danger';
    if (k === 'neutra') return 'warn';
    return 'good';
  }

  private buildEmotionDoughnut() {
    const labels = this.emotionsOrder.map(k => this.emotionLabels[k] ?? k);
    const values = this.emotionsOrder.map(k => (this.chartProbs[k] ?? 0) * 100);
    const colors = this.emotionsOrder.map(k => this.emotionColors[k] ?? '#9ca3af');
    this.doughnutData = { labels, datasets: [{ data: values, backgroundColor: colors }] };
  }

  private mapFeedback(api: any): Feedback {
    const f = Array.isArray(api) ? (api[0] ?? {}) : api ?? {};
    return {
      general_feedback:     f.general_feedback     ?? '',
      confidence_feedback:  f.confidence_feedback  ?? '',
      anxiety_feedback:     f.anxiety_feedback     ?? '',
      language_feedback:    f.language_feedback    ?? '',
      suggestions:          f.suggestions          ?? '',
      dominant_emotion:     f.dominant_emotion     ?? null,
      confidence:           f.confidence           ?? null,
      emotion_probabilities:f.emotion_probabilities?? null,
    };
  }

  // Nivel helpers
  private betweenLabelFromRaw(raw: number){
    const i = Math.min(4, Math.max(0, Math.floor(raw)));
    return `Entre ${this.EMO_NAMES[i]} y ${this.EMO_NAMES[i+1]}`;
  }
  private colorFromLevel(idx: number){
    switch (idx){
      case 1: return '#ef4444';
      case 2: return '#f97316';
      case 3: return '#f59e0b';
      case 4: return '#14b8a6';
      case 5: return '#22c55e';
      default: return '#14b8a6';
    }
  }
  segmentFill(i: number): number {
    const current = this.levelIndex - 1;
    if (i < current) return 100;
    if (i > current) return 0;
    return Math.max(0, Math.min(100, this.withinLevelPct));
  }

  // UI
  private confidenceStars(probDominante01: number, total = 5) {
    return Math.max(1, Math.round((probDominante01 || 0) * total));
  }
  starsLine(n: number, total = 5) {
    const full = Math.floor(n);
    const half = n % 1 >= 0.5 ? 1 : 0;
    return '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(total - full - half);
  }
  getEmotionPercentage(key: string): number {
    return Math.round((this.chartProbs?.[key] ?? 0) * 100);
  }

  goToPractice() {
    this.router.navigate(['/presentations']);
  }

  // Lenguaje (regex simple)
  private analyzeLanguage(text: string): LangMetrics {
    const POS = [
      /\bexcelente\b/gi, /\bgenial\b/gi, /\bclar[oa]s?\b/gi, /\bsegur[oa]s?\b/gi,
      /\blograr\w*\b/gi, /\bobjetiv\w+\b/gi, /\bconfianz\w*\b/gi, /\btranquil\w*\b/gi
    ];
    const NEG = [
      /\bnervios?\b/gi, /\bansios\w*\b/gi, /\bpreocupad\w*\b/gi, /\bdud\w*\b/gi,
      /\btemor(es)?\b/gi, /\bestresad\w*\b/gi, /\bno puedo\b/gi, /\bdif[ií]cil\b/gi
    ];
    const FILLERS = [
      /\beh+\b/gi, /\bem+\b/gi, /\bmmm+\b/gi,
      /\b(o\s*sea|osea)\b/gi, /\beste\b/gi, /\bpues\b/gi, /\bya\b/gi,
      /\bdigamos\b/gi, /\bvale\b/gi, /\btipo\b/gi, /\bnada\b/gi,
      /\bbueno\b/gi, /\bentonces\b/gi, /\ba ver\b/gi, /\bdigo\b/gi,
      /\bcomo que\b/gi, /\beste que\b/gi,
      /\bvoy a hablar\b/gi, /\bcomo est[aá] afectando\b/gi,
      /\BBeatriz\b/gi, /\bSandoval\b/gi
    ];

    const words = (text.match(/\b[\wáéíóúñü]+\b/gi) || []).length;
    const count = (rgxs: RegExp[]) => rgxs.reduce((s, r) => s + ((text.match(r)?.length) || 0), 0);

    const samples = (rgxs: RegExp[], max = 5) => {
      const out: string[] = [];
      for (const r of rgxs) {
        const it = text.matchAll(r);
        for (const m of it) {
          const i = m.index ?? 0;
          out.push(text.slice(Math.max(0, i - 15), Math.min(text.length, i + (m[0].length + 15))).trim());
          if (out.length >= max) return out;
        }
      }
      return out;
    };

    const positive_words = count(POS);
    const negative_words = count(NEG);
    const filler_count   = count(FILLERS);

    const good_examples   = samples(POS);
    const bad_examples    = samples(NEG);
    const filler_examples = samples(FILLERS);

    const tips: string[] = [];
    if (filler_count >= 1) tips.push('Reduce muletillas (“este”, “o sea”, “bueno”). Practica pausas de 1s.');
    if (negative_words > positive_words) tips.push('Refuerza lenguaje positivo: “claramente…”, “estamos seguros de…”, “logramos…”.');
    if (positive_words === 0) tips.push('Incluye afirmaciones de seguridad/claridad para transmitir confianza.');
    tips.push('Ejercicios: respiración 4-7-8, shadowing, ensayo cronometrado y grabación.');
    tips.push('Cierre: prepara dos versiones (30s y 10s) y remarca el aporte clave.');

    return {
      total_words: words,
      positive_words,
      negative_words,
      filler_count,
      good_examples,
      bad_examples,
      filler_examples,
      tips
    };
  }

  // ===== UX helpers =====
  private buildReflection(dom: string, anxietyPct: number): string {
    if (dom === 'ansiosa' || dom === 'nerviosa') {
      return 'Tu voz mostró algo de tensión, lo cual es normal al presentar. Empieza con una frase corta y pausa de 1 segundo para estabilizar el ritmo.';
    }
    if (dom === 'entusiasta') {
      return 'Tu tono reflejó energía y entusiasmo. En la próxima, cuida que el ritmo no se acelere y deja pequeñas pausas para mantener claridad.';
    }
    if (dom === 'confiada') {
      return 'Tu voz transmitió seguridad. Intenta sostener esa firmeza también en las partes más técnicas con frases claras y cierres breves.';
    }
    if (dom === 'motivada') {
      return 'Tu voz transmitió motivación. Intenta sostener esa energía también en las partes más técnicas con frases claras y cierres breves.';
    }
    if (anxietyPct > 40) {
      return 'El tono fue estable pero con algo de tensión. Prueba una respiración lenta antes de empezar y marca la primera pausa tras la primera frase.';
    }
    return 'Tu tono fue equilibrado. Para ganar impacto, resalta la idea clave con una frase corta y un cierre claro.';
  }

  private parseSuggestions(raw: string, lang: LangMetrics | null): string[] {
    const cleaned = (raw || '').trim();
    const parts = cleaned
      .split(/\r?\n/)
      .map(s => s.trim())
      .flatMap(line => line.split(/(?:^|\s)(?:\d+\)|\d+\.-|[•\-—]|[0-]️⃣)\s+/).map(s => s.trim()))
      .filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 5);

    // Fallback
    const fallback: string[] = [];
    const fillers = lang?.filler_count ?? 0;
    const words = lang?.total_words ?? 0;

    if (fillers > 0) fallback.push('Habla 60 s intentando no decir “eh/este/osea”. Si necesitas pensar, usa una pausa de 1 segundo.');
    if (words < 120) fallback.push('Usa estructura 1–2–1: inicio (10 s), idea principal (40–60 s), cierre (15 s).');
    fallback.push('Graba 30 s con tu conclusión y comprueba si suena clara y firme.');
    return fallback.slice(0, 3);
  }

  /** Genera recursos externos en función de las necesidades detectadas. */
private buildResources(ctx: { anxietyPct: number; fillers: number; totalWords: number; dom: string }): ResourceLink[] {
  const list: ResourceLink[] = [];

  // === 1) Regulación / ansiedad ===
  if (ctx.anxietyPct > 25 || ctx.dom === 'ansiosa' || ctx.dom === 'nerviosa') {
    list.push(
      {
        title: '6 ejercicios para hablar en público con soltura(video)',
        url: 'https://www.youtube.com/watch?v=8Ok7h5cOQ88',
        note: 'Guía breve para mejorar la fluidez al hablar en público.',
        tag: 'respiración'
      },
    );
  }

  // === 2) Muletillas detectadas ===
  if (ctx.fillers > 0) {
    list.push(
      {
        title: 'Domina tu discurso: estrategias para eliminar muletillas (Uniminuto)',
        url: 'https://virtual.uniminuto.edu/blog/domina-tu-discurso-con-estas-estrategias-para-eliminar-las-muletillas/',
        note: 'Plan práctico paso a paso pensado para estudiantes.',
        tag: 'muletillas'
      }
    );
  }

  // === 3) Estructura / claridad (discurso muy corto) ===
  if (ctx.totalWords < 120) {
    list.push(
      {
        title: 'Cómo redactar un discurso paso a paso (video)',
        url: 'https://www.youtube.com/watch?v=EtaTTvTj4wk',
        note: 'Estructura simple para mejorar claridad cuando el discurso queda corto.',
        tag: 'estructura'
      },
      {
        title: '10 consejos para hacer una buena presentación (EF)',
        url: 'https://www.ef.com/wwes/blog/language/consejos-para-hacer-una-buena-presentacion/',
        note: 'Estructura, apoyo visual y claridad en presentaciones.',
        tag: 'estructura'
      }
    );
  }

  // === 4) Ritmo / velocidad (siempre útil para comprensibilidad) ===
  list.push({
    title: '¿Cómo hablar con un buen ritmo? (video)',
    url: 'https://www.youtube.com/watch?v=mXSJBJJtZLA',
    note: 'Consejos prácticos para mejorar el ritmo y la entonación.',
    tag: 'ritmo'
  });

  // === 5) Storytelling / cierres memorables (relevante en casi todos los casos) ===
  list.push(
    {
      title: 'Ejemplo real: discurso de graduación (Jorge Branger)',
      url: 'https://www.youtube.com/watch?v=1lTjLrHsD9A',
      note: 'Modelo de tono, ritmo y estructura; útil para inspirar tu cierre.',
      tag: 'story'
    }
  );

  // Recorte suave (deja 6–10 enlaces máx. según contexto)
  return list.slice(0, 10);
}

  // ===== Generación de PDF =====
 // ===== Generación de PDF =====
// ===== Generación de PDF =====
downloadReport(): void {
  if (!this.reportContent) return;

  // 1) Mostrar el reporte solo para la captura
  this.showReportForPdf = true;

  // Dejamos que Angular pinte el contenido antes de capturar
  setTimeout(() => {
    const element = this.reportContent.nativeElement as HTMLElement;

    const options: any = {
      margin: 10, // 2.54 cm
      filename: `reporte-presentacion-${this.currentDate.toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf()
      .set(options)
      .from(element)
      .save()
      .then(() => {
        this.showReportForPdf = false;  // 2) Volvemos a ocultar
      })
      .catch(() => {
        this.showReportForPdf = false;  // por si falla
      });
  }, 0);
}



}

