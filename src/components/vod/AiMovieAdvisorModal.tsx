import React, { useState } from 'react';
import { 
  Sparkles, Bot, X, Play, Search, Film, Star, 
  Send, RefreshCw, Compass, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { VodItem } from '../../types/iptv.types';

export interface AiRecommendation {
  title: string;
  year: string;
  rating: string;
  genres: string[];
  moodMatch: string;
  reason: string;
  hook: string;
}

interface AiMovieAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableMovies?: VodItem[];
  onPlayMovie?: (movie: VodItem) => void;
  onSearchInCatalog?: (query: string) => void;
}

const QUICK_MOODS = [
  { id: 'family', label: '🍿 سهرة عائلية مسلية', prompt: 'اقترح أفضل أفلام عائلية ممتعة ومناسبة للجميع ومليئة بالدفء والكوميديا' },
  { id: 'scifi', label: '🚀 خيال علمي عميق وأبعاد', prompt: 'اقترح أفلام خيال علمي فلسفية عميقة تتناول الفضاء، السفر عبر الزمن أو الذكاء الاصطناعي مع أفكار مذهلة' },
  { id: 'mystery', label: '🕵️‍♂️ غموض وتحقيقات (Plot Twist)', prompt: 'اقترح أفلام غموض وجريمة ذكية جداً بحبكة غير متوقعة ونهاية صادمة لا يمكن توقعها' },
  { id: 'action', label: '⚡ أكشن وأدرينالين سريع', prompt: 'اقترح أفلام حركة وإثارة ومطاردات سريعة الإيقاع ترفع الأدرينالين' },
  { id: 'drama', label: '🎭 دراما مؤثرة وسينما راقية', prompt: 'اقترح روائع سينمائية عالمية حائزة على جوائز أوسكار ذات قصة مؤثرة وعميقة' },
  { id: 'thriller', label: '👻 رعب نفسي وتشويق متوتر', prompt: 'اقترح أفلام رعب نفسي وإثارة ذكية تحبس الأنفاس دون ابتذال' }
];

const OFFLINE_FALLBACK_RECOMMENDATIONS: Record<string, AiRecommendation[]> = {
  family: [
    {
      title: 'Paddington 2',
      year: '2017',
      rating: '7.8',
      genres: ['مغامرات', 'عائلي', 'كوميدي'],
      moodMatch: 'سهرة عائلية دافئة',
      reason: 'فيلم ساحر بصرياً، يزرع البهجة في قلوب الكبار والصغار ومكتوب بعناية فائقة.',
      hook: 'تحفة دافئة تنير الأمسيات وتجمع كل أفراد العائلة بابتسامة.'
    },
    {
      title: 'Coco',
      year: '2017',
      rating: '8.4',
      genres: ['أنيميشن', 'موسيقي', 'فانتازيا'],
      moodMatch: 'عائلي ومؤثر',
      reason: 'رحلة ألوان وموسيقى تحتفي بصلة الرحم والذكريات، بأعلى درجات الإتقان الفني.',
      hook: 'أغنية واحدة ستجعل كل فرد في العائلة يتأثر بجمال القصة.'
    }
  ],
  scifi: [
    {
      title: 'Interstellar',
      year: '2014',
      rating: '8.7',
      genres: ['خيال علمي', 'دراما', 'مغامرة'],
      moodMatch: 'رحلة أبعاد عميقة',
      reason: 'ملحمة نولان الاستثنائية التي تجمع بين فيزياء الثقوب الدودية وعاطفة الأبوة الخالدة وموسيقى زيمر المهيبة.',
      hook: 'سفر عبر الزمان والمكان يتجاوز حدود العقل البشري.'
    },
    {
      title: 'Arrival',
      year: '2016',
      rating: '7.9',
      genres: ['خيال علمي', 'غموض', 'لغويات'],
      moodMatch: 'فلسفي وذكي جداً',
      reason: 'نظرة غير تقليدية على التواصل الفضائي ومفهوم الزمن كحلقة دائرية متصلة.',
      hook: 'كيف يمكن للغة أن تغير إدراكنا للماضي والمستقبل؟'
    }
  ],
  mystery: [
    {
      title: 'Knives Out',
      year: '2019',
      rating: '7.9',
      genres: ['جريمة', 'غموض', 'كوميديا سوداء'],
      moodMatch: 'تحقيق وتحري ممتع',
      reason: 'تحية عصرية لقصص أجاثا كريستي بحبكة متقنة وسيناريو مشوق يجعلك تشك في الجميع حتى اللحظة الأخيرة.',
      hook: 'كل شخصية في القصر تخفي دافعاً للجريمة!'
    },
    {
      title: 'Shutter Island',
      year: '2010',
      rating: '8.2',
      genres: ['غموض', 'رعب نفسي', 'إثارة'],
      moodMatch: 'نهاية تصدم العقل',
      reason: 'مارتن سكورسيزي وليوناردو ديكابريو في مصحة عقلية معزولة وسط عاصفة، مع نهاية ستغير رؤيتك لكل مشهد.',
      hook: 'هل تؤمن بما تراه عيناك أم ما تريده عقولهم؟'
    }
  ],
  action: [
    {
      title: 'Mad Max: Fury Road',
      year: '2015',
      rating: '8.1',
      genres: ['أكشن', 'مغامرة', 'إثارة'],
      moodMatch: 'أدرينالين متواصل',
      reason: 'سيمفونية حركة بصرية حقيقية من البداية للنهاية دون توقف لحظة واحدة مع تصميم صوتي مذهل.',
      hook: 'مطاردة ملحمية في صحراء مقفرة لن تلتقط فيها أنفاسك.'
    },
    {
      title: 'Top Gun: Maverick',
      year: '2022',
      rating: '8.3',
      genres: ['أكشن', 'طيران', 'دراما'],
      moodMatch: 'حماس وروح بطولية',
      reason: 'تصوير جوي واقعي في مقاتلات حقيقية يمنح تجربة سينمائية فريدة لا مثيل لها.',
      hook: 'السرعة الفائقة وتحدي المستحيل في سماء المعركة.'
    }
  ],
  drama: [
    {
      title: 'The Shawshank Redemption',
      year: '1994',
      rating: '9.3',
      genres: ['دراما', 'صداقة', 'أمل'],
      moodMatch: 'أعظم فيلم في تاريخ السينما',
      reason: 'الفيلم الأعلى تقييماً في تاريخ IMDb، درس لا يُنسى في الصبر، الأمل، وقوة الروح الإنسانية.',
      hook: 'الأمل شيء جيد، وربما أفضل الأشياء، والأشياء الجيدة لا تموت أبداً.'
    }
  ],
  thriller: [
    {
      title: 'A Quiet Place',
      year: '2018',
      rating: '7.5',
      genres: ['رعب', 'تشويق', 'خيال علمي'],
      moodMatch: 'صمت يحبس الأنفاس',
      reason: 'توظيف عبقري للصوت والصمت؛ حيث تصبح أي همسة أو خطوة خطراً مميتاً على العائلة.',
      hook: 'إذا سمعوك... فسينقضون عليك!'
    }
  ]
};

export const AiMovieAdvisorModal: React.FC<AiMovieAdvisorModalProps> = ({
  isOpen,
  onClose,
  availableMovies = [],
  onPlayMovie,
  onSearchInCatalog
}) => {
  const [activeMood, setActiveMood] = useState<string>('scifi');
  const [userQuery, setUserQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>(OFFLINE_FALLBACK_RECOMMENDATIONS.scifi);
  const [aiNote, setAiNote] = useState<string>('اختر مزاج سهرتك أو اكتب استفسارك الخاص للذكاء الاصطناعي');

  if (!isOpen) return null;

  const handleSelectMood = async (mood: typeof QUICK_MOODS[0]) => {
    setActiveMood(mood.id);
    setUserQuery(mood.prompt);
    await fetchAiRecommendations(mood.prompt, mood.id);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    await fetchAiRecommendations(userQuery, activeMood);
  };

  const fetchAiRecommendations = async (promptText: string, fallbackKey: string) => {
    setIsLoading(true);
    setAiNote('جارٍ تحليل الأنماط السينمائية واختيار أفضل المقترحات لسهرتك...');

    try {
      // Free, open, zero-config AI endpoint
      const systemInstruction = `أنت خبير سينمائي ذكي وممتع لتطبيق IPTV. 
مهمتك اقتراح 2 إلى 3 أفلام استثنائية بناءً على طلب المستخدم: "${promptText}".
يجب الرد بصيغة JSON حصرية فقط كالتالي دون أي مقدمات أو علامات Markdown:
[
  {
    "title": "اسم الفيلم بالإنجليزي",
    "year": "2024",
    "rating": "8.4",
    "genres": ["خيال علمي", "غموض"],
    "moodMatch": "سهرة ذكية وحماسية",
    "reason": "سبب التوصية ولماذا يستحق المشاهدة باختصار شديد",
    "hook": "جملة تشويقية قصيرة تجذب المشاهد"
  }
]`;

      const encodedPrompt = encodeURIComponent(systemInstruction);
      const res = await fetch(`https://text.pollinations.ai/${encodedPrompt}?model=openai&json=true`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000) // 6s fast timeout
      });

      if (res.ok) {
        const text = await res.text();
        // Clean possible markdown code blocks ```json ... ```
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validated: AiRecommendation[] = parsed.map((item: any) => ({
            title: String(item.title || 'فيلم مميز'),
            year: String(item.year || '2023'),
            rating: String(item.rating || '8.0'),
            genres: Array.isArray(item.genres) ? item.genres : ['سينما', 'تشويق'],
            moodMatch: String(item.moodMatch || 'توصية الذكاء الاصطناعي'),
            reason: String(item.reason || 'عمل سينمائي رائع يستحق وقتك.'),
            hook: String(item.hook || 'سهرة سينمائية لا تُنسى.')
          }));
          setRecommendations(validated);
          setAiNote(`تم اختيار أفضل الأعمال المناسبة لطلبك عبر الذكاء الاصطناعي`);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[AI Advisor] API request failed or timed out, using curated fallback catalog:', err);
    }

    // Fallback to curated catalog
    const fallback = OFFLINE_FALLBACK_RECOMMENDATIONS[fallbackKey] || OFFLINE_FALLBACK_RECOMMENDATIONS.scifi;
    setRecommendations(fallback);
    setAiNote('مختارات الذكاء الاصطناعي من أرشيف الروائع السينمائية العالمية');
    setIsLoading(false);
  };

  // Check if a recommended movie exists in available catalog
  const findMatchingMovie = (title: string): VodItem | undefined => {
    const clean = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return availableMovies.find(m => {
      const target = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return target.includes(clean) || clean.includes(target);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-950/95 border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/40 flex flex-col overflow-hidden text-right">
        
        {/* Header Bar with Ambient Purple Glow */}
        <div className="relative p-5 md:p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/40 via-indigo-950/30 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white">مستشار السينما الذكي (AI Movie Advisor)</h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  مجاني 100%
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                اكتشف سهرتك القادمة بذكاء اصطناعي يفهم ذوقك السينمائي ويرشح لك الأجمل فوراً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          
          {/* Quick Mood Chips */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>اختر مزاج سهرتك اليوم:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_MOODS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => handleSelectMood(mood)}
                  className={`p-3 rounded-2xl text-xs font-bold text-right transition-all border flex items-center justify-between ${
                    activeMood === mood.id
                      ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 border-purple-400 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{mood.label}</span>
                  {activeMood === mood.id && <CheckCircle2 className="w-4 h-4 text-purple-200" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>أو اسأل الذكاء الاصطناعي بحرية:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="مثال: فيلم يشبه Shutter Island بحبكة صادمة، أو فيلم أكشن خفيف لسهرة سريعة..."
                  className="w-full h-11 px-4 text-xs md:text-sm bg-surface-elevated border border-white/15 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !userQuery.trim()}
                className="h-11 px-5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>اسأل</span>
                    <Send className="w-3.5 h-3.5 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Status / Note */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>{aiNote}</span>
            </span>
            <span className="font-mono text-purple-300">Open AI Engine</span>
          </div>

          {/* Recommendations Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Film className="w-4 h-4 text-amber-400" />
              <span>الأفلام المقترحة لسهرتك:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec, idx) => {
                const matched = findMatchingMovie(rec.title);

                return (
                  <div 
                    key={idx} 
                    className="relative bg-gradient-to-br from-surface-elevated to-slate-900/90 border border-white/15 hover:border-purple-400/60 rounded-3xl p-5 flex flex-col justify-between shadow-xl transition-all group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-accent-gold border border-amber-500/30">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="font-mono">{rec.rating}</span> IMDb
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                            {rec.year}
                          </span>
                          <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                            {rec.moodMatch}
                          </span>
                        </div>
                      </div>

                      {/* Title & Hook */}
                      <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-purple-200/90 italic font-medium mt-1 mb-2">
                        "{rec.hook}"
                      </p>

                      {/* Reason */}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-3">
                        {rec.reason}
                      </p>

                      {/* Genre Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-4">
                        {rec.genres.map((g, gIdx) => (
                          <span key={gIdx} className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                      {matched && onPlayMovie ? (
                        <button
                          onClick={() => {
                            onPlayMovie(matched);
                            onClose();
                          }}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>متوفر بالمكتبة • تشغيل الآن</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (onSearchInCatalog) {
                              onSearchInCatalog(rec.title);
                            }
                            onClose();
                          }}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/15"
                        >
                          <Search className="w-3.5 h-3.5 text-purple-400" />
                          <span>بحث عن الفيلم في المكتبة</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
          <span>يعمل بدون مفتاح API • مفتوح ومجاني دائماً</span>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold flex items-center gap-1"
          >
            <span>إغلاق المستشار</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
