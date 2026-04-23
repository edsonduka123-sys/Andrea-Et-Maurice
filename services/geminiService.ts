
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Category, Quote } from "../types";
import { FALLBACK_QUOTES, FALLBACK_QUESTIONS } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;
  // Cache pour stocker les questions pré-chargées par catégorie
  private questionCache: Map<Category, string[]> = new Map();
  // Pour éviter de lancer plusieurs requêtes de préchauffage en même temps
  private fetchingPromises: Map<Category, Promise<void>> = new Map();

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
  }

  /**
   * Crée une session de chat dédiée au coaching de couple.
   */
  createCoachChat(): Chat {
    return this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        temperature: 0.7,
        systemInstruction: `Tu es le "Coach Love" d'Andrea et Maurice.
        Ton rôle est d'être un médiateur bienveillant, un conseiller sage et parfois drôle pour ce couple.
        
        Tes objectifs :
        1. Aider à la communication : Si l'un d'eux a du mal à exprimer quelque chose, aide-le à reformuler.
        2. Arbitrer avec humour : S'ils ont un débat léger (ex: qui fait la vaisselle), donne un avis impartial et amusant.
        3. Donner des conseils : Propose des idées de sorties, de cadeaux ou d'attentions basées sur ce qu'ils te disent.
        4. Être concis : Tes réponses doivent être courtes, lisibles sur mobile, et chaleureuses.
        
        Ne sois jamais moralisateur. Sois comme un ami cool et intelligent qui veut voir leur couple s'épanouir.`,
      },
    });
  }

  /**
   * Vérifie si le cache a besoin d'être rempli pour une catégorie
   */
  async warmup(category: Category): Promise<void> {
    const cached = this.questionCache.get(category) || [];
    // Si on a moins de 2 questions en réserve, on lance un chargement en arrière-plan
    if (cached.length < 2 && !this.fetchingPromises.has(category)) {
      this.fetchBatch(category).catch(console.error);
    }
  }

  /**
   * Récupère une question. Si le cache est vide, attend la réponse de l'API.
   * Sinon, retourne instantanément une question du cache.
   */
  async generateQuestion(category: Category): Promise<string> {
    // 1. Essayer de prendre dans le cache
    const cached = this.questionCache.get(category) || [];
    if (cached.length > 0) {
      const question = cached.pop();
      this.questionCache.set(category, cached);
      
      // Si le cache se vide, on recharge discrètement en arrière-plan pour la prochaine fois
      if (cached.length < 2) {
        this.warmup(category);
      }
      return question!;
    }

    // 2. Si cache vide, on doit attendre l'API (cela remplira aussi le cache)
    await this.fetchBatch(category);
    
    // 3. Récupérer après le fetch
    const newCached = this.questionCache.get(category) || [];
    const question = newCached.pop();
    this.questionCache.set(category, newCached);

    return question || this.getRandomFallback(category);
  }

  private async fetchBatch(category: Category): Promise<void> {
    // Évite les doublons de requêtes
    if (this.fetchingPromises.has(category)) {
      return this.fetchingPromises.get(category);
    }

    const fetchPromise = (async () => {
      try {
        let systemPrompt = "";
        
        if (category === Category.CHALLENGE) {
          systemPrompt = `Tu es un coach de couple fun et audacieux.
          Génère une liste de 5 "Défis" ou "Actions" INÉDITS pour un couple à faire maintenant ou bientôt.
          
          RÈGLES :
          - Langue : Français
          - Output : Uniquement un objet JSON contenant un tableau de strings.
          - Style : Ludique, un peu piquant, romantique ou drôle.
          - Commence chaque phrase par "Challenge :" ou "Action :" ou un verbe impératif.
          - Exemple : "Challenge : Massez-vous les mains pendant 2 minutes chacun."`;
        } else if (category === Category.QUIZ) {
          systemPrompt = `Tu es un animateur de jeu télévisé pour couples.
          Génère une liste de 5 questions de type "Qui de nous deux ?" (Who is most likely to).
          
          RÈGLES :
          - Langue : Français
          - Output : Uniquement un objet JSON contenant un tableau de strings.
          - Style : Amusant, révélateur, parfois taquin.
          - Format : "Qui de nous deux..."
          - Exemple : "Qui de nous deux survivrait le plus longtemps dans une apocalypse zombie ?"`;
        } else if (category === Category.YOU_RATHER) {
          systemPrompt = `Tu es un créateur de dilemmes amusants et profonds.
          Génère une liste de 5 questions de type "Tu préfères..." (Would you rather).
          Les sujets doivent couvrir tous les aspects de la vie : drôle, surréaliste, romantique, futur, etc.
          
          RÈGLES :
          - Langue : Français
          - Output : Uniquement un objet JSON contenant un tableau de strings.
          - Style : Créatif, absurde, romantique ou philosophique.
          - Format : "Tu préfères [option A] ou [option B] ?"
          - Exemple : "Tu préfères avoir le pouvoir de voler ou de devenir invisible ?"`;
        } else if (category === Category.TRUE_FALSE) {
          systemPrompt = `Tu es un expert en psychologie de couple et en anecdotes amusantes.
          Génère une liste de 5 affirmations "Vrai ou Faux" pour un couple.
          
          RÈGLES :
          - Langue : Français
          - Output : Uniquement un objet JSON contenant un tableau de strings.
          - Style : Surprenant, psychologique, ou drôle.
          - Format : "Vrai ou Faux : [affirmation]"
          - Exemple : "Vrai ou Faux : Les couples qui rient ensemble durent plus longtemps."`;
        } else if (category === Category.STORYTELLER) {
          systemPrompt = `Tu es un maître du jeu de rôle et un conteur d'histoires.
          Génère une liste de 5 débuts d'histoires ou scénarios imaginatifs que le couple doit continuer ensemble.
          
          RÈGLES :
          - Langue : Français
          - Output : Uniquement un objet JSON contenant un tableau de strings.
          - Style : Aventureux, romantique, drôle ou surréaliste.
          - Format : "Imaginez que... [scénario]" ou "Il était une fois... [scénario]"
          - Exemple : "Imaginez que nous nous réveillons demain avec la capacité de lire dans les pensées de l'autre. Que se passe-t-il pendant le petit-déjeuner ?"`;
        } else {
          systemPrompt = `Tu es un expert en relations amoureuses.
          Génère une liste de 5 questions INÉDITES et PROFONDES pour un couple, sur le thème : "${category}".
          
          RÈGLES :
          - Langue : Français
          - Output : Uniquement un objet JSON contenant un tableau de strings.
          - Style : Créatif, curieux, jamais ennuyeux.
          - Diversité : Mélange des questions philosophiques et des mises en situation.`;
        }

        const response = await this.ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: systemPrompt,
          config: {
            temperature: 1.1, // Un peu plus de créativité
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            }
          },
        });

        const text = response.text || '';
        const data = JSON.parse(text);
        
        if (data.questions && Array.isArray(data.questions)) {
          const currentCache = this.questionCache.get(category) || [];
          // On mélange les nouvelles questions avec le cache existant
          const newQuestions = [...currentCache, ...data.questions];
          this.questionCache.set(category, newQuestions);
        }
      } catch (error) {
        console.error(`Error fetching batch for ${category}:`, error);
        // En cas d'erreur, on remplit un peu le cache avec des fallbacks pour ne pas bloquer l'app
        const fallbacks = this.getMultipleFallbacks(category, 3);
        const currentCache = this.questionCache.get(category) || [];
        this.questionCache.set(category, [...currentCache, ...fallbacks]);
      } finally {
        this.fetchingPromises.delete(category);
      }
    })();

    this.fetchingPromises.set(category, fetchPromise);
    return fetchPromise;
  }

  private getRandomFallback(category: Category): string {
    const list = FALLBACK_QUESTIONS[category] || FALLBACK_QUESTIONS[Category.DEEP];
    return list[Math.floor(Math.random() * list.length)];
  }

  private getMultipleFallbacks(category: Category, count: number): string[] {
    const list = FALLBACK_QUESTIONS[category] || FALLBACK_QUESTIONS[Category.DEEP];
    const results: string[] = [];
    for(let i=0; i<count; i++) {
      results.push(list[Math.floor(Math.random() * list.length)]);
    }
    return results;
  }

  // ... code existant pour les citations ...
  async generateDailyQuote(): Promise<Quote> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Génère une citation d'amour magnifique. Format JSON {text, author}.`,
        config: {
          temperature: 1.0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              author: { type: Type.STRING }
            },
            required: ["text", "author"]
          }
        },
      });

      const text = response.text || '';
      const data = JSON.parse(text);
      return data;
    } catch (error) {
      const randomIndex = Math.floor(Math.random() * FALLBACK_QUOTES.length);
      return FALLBACK_QUOTES[randomIndex];
    }
  }
}

export const geminiService = new GeminiService();
