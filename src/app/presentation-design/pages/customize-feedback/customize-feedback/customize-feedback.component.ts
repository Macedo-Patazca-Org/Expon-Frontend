import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PresentationService } from '../../../../student-management/services/presentation.service';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NgChartsModule } from 'ng2-charts';
import {
  Chart, ArcElement, Tooltip, Legend,
  ChartOptions, ChartData
} from 'chart.js';

// Registramos solo lo necesario
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

@Component({
  selector: 'app-customize-feedback',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './customize-feedback.component.html',
  styleUrls: ['./customize-feedback.component.css']
})
export class CustomizeFeedbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private presentationService = inject(PresentationService);

  loading = true;
  error = false;

  // 👉 Textos procedentes de /feedback/
  feedbackData: Feedback | null = null;

  // 👉 Fuente para el gráfico principal (sale de /presentation/:id)
  chartProbs: Record<string, number> = {}; // 0..1
  chartDominant: string | null = null;
  chartConfidence01 = 0;                   // 0..1

  // Estrellas y métricas
  starsConfidence = 0; // 1..5
  starsOverall = 0;    // 1..5
  levels010: Partial<Record<string, number>> = {};

  transcript: string | null = null;
  lang: LangMetrics | null = null;

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

  // ===== ÚNICO chart: Doughnut de emociones =====
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false, cutout: '55%',
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (c) => `${c.label}: ${(c.raw as number).toFixed(1)}%` } }
    }
  };
  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = true; this.loading = false; return; }

    forkJoin({
      detail: this.presentationService.getPresentationById(id),
      feedback: this.presentationService.getFeedbackByPresentationId(id).pipe(
        catchError(() => of(null))
      ),
    }).subscribe({
      next: ({ detail, feedback }) => {
        // 1) Emociones desde presentation
        this.chartProbs = (detail?.emotion_probabilities ?? {}) as Record<string, number>;
        this.chartDominant = detail?.dominant_emotion ?? null;
        this.chartConfidence01 = Number(detail?.confidence ?? 0);

        // 2) Textos de feedback (si existen)
        this.feedbackData = feedback ? this.mapFeedback(feedback) : null;

        // 3) Transcript y análisis de lenguaje (para consejos)
        this.transcript = (detail?.transcript || '').trim() || null;
        if (this.transcript) this.lang = this.analyzeLanguage(this.transcript);

        // 4) Derivados / UI
        this.levels010 = this.computeLevels010(this.chartProbs);
        this.starsConfidence = this.confidenceStars(this.chartConfidence01);
        this.starsOverall = this.overallStars(this.chartProbs);

        // 5) Construir el único gráfico
        this.buildEmotionDoughnut();

        this.loading = false;
      },
      error: _ => { this.error = true; this.loading = false; }
    });
  }

  private buildEmotionDoughnut() {
    const labels = this.emotionsOrder.map(k => this.emotionLabels[k] ?? k);
    const values = this.emotionsOrder.map(k => (this.chartProbs[k] ?? 0) * 100);
    const colors = this.emotionsOrder.map(k => this.emotionColors[k] ?? '#9ca3af');
    this.doughnutData = { labels, datasets: [{ data: values, backgroundColor: colors }] };
  }

  // --- mapeo robusto por si el backend cambia nombres (obj o array) ---
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

  // ---------- Utilidades UI ----------
  private computeLevels010(probs: Record<string, number>) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(probs || {})) {
      out[k] = Math.round(v * 10 * 10) / 10; // 0..10 con 1 decimal
    }
    return out;
  }

  private confidenceStars(probDominante01: number, total = 5) {
    return Math.max(1, Math.round((probDominante01 || 0) * total)); // 1..5
  }

  private overallStars(probs01: Record<string, number>, total = 5) {
    const POS = new Set(['confiada','motivada','entusiasta']);
    const NEG = new Set(['ansiosa','nerviosa']);
    const pos = Object.entries(probs01 || {}).reduce((s,[k,v]) => s + (POS.has(k) ? v : 0), 0);
    const neg = Object.entries(probs01 || {}).reduce((s,[k,v]) => s + (NEG.has(k) ? v : 0), 0);
    const raw = Math.min(total, Math.max(1, 2.5 + 2.5 * (pos - neg))); // 1..5 centrado en 2.5
    return Math.round(raw);
  }

  starsLine(n: number, total = 5) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, total - n));
  }

  getEmotionPercentage(key: string): number {
    return Math.round((this.chartProbs?.[key] ?? 0) * 100);
  }

  // ---------- Lenguaje (regex simple en front) ----------
  private analyzeLanguage(text: string): LangMetrics {
  const POS = [
    /\bexcelente\b/gi, /\bgenial\b/gi, /\bclar[oa]s?\b/gi, /\bsegur[oa]s?\b/gi,
    /\blograr\w*\b/gi, /\bobjetiv\w+\b/gi, /\bconfianz\w*\b/gi, /\btranquil\w*\b/gi
  ];
  const NEG = [
    /\bnervios?\b/gi, /\bansios\w*\b/gi, /\bpreocupad\w*\b/gi, /\bdud\w*\b/gi,
    /\btemor(es)?\b/gi, /\bestresad\w*\b/gi, /\bno puedo\b/gi, /\bdif[ií]cil\b/gi
  ];

  // Muletillas ampliadas (palabras y frases frecuentes)
  const FILLERS = [
    /\beh+\b/gi, /\bem+\b/gi, /\bmmm+\b/gi,
    /\b(o\s*sea|osea)\b/gi, /\beste\b/gi, /\bpues\b/gi, /\bya\b/gi,
    /\bdigamos\b/gi, /\bvale\b/gi, /\btipo\b/gi, /\bnada\b/gi,
    /\bbueno\b/gi, /\bentonces\b/gi, /\ba ver\b/gi, /\bdigo\b/gi,
    /\bcomo que\b/gi, /\beste que\b/gi,
    /\bvoy a hablar\b/gi, /\bcomo est[aá] afectando\b/gi
  ];

  const words = (text.match(/\b[\wáéíóúñü]+\b/gi) || []).length;
  const count = (rgxs: RegExp[]) =>
    rgxs.reduce((s, r) => s + ((text.match(r)?.length) || 0), 0);

  // Extrae pequeños fragmentos alrededor de cada match
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
    filler_count,        // ← alimenta el KPI
    good_examples,
    bad_examples,
    filler_examples,
    tips
  };
}

}
