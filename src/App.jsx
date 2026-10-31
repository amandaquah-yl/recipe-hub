"use client";
import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Search, PlusCircle, BookOpen, ExternalLink, Trash2, ChefHat, CheckCircle2, Circle, Wand2, Filter, ChevronDown, ChevronUp, Globe, Image as ImageIcon, FileText, Share2, Clock, Heart, Star, Calendar, ShoppingCart, Check, X } from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyDNL6udjRqCDEpS4ST0mVGD813OwJlbTiE",
  authDomain: "recipe-hub-b1521.firebaseapp.com",
  projectId: "recipe-hub-b1521",
  storageBucket: "recipe-hub-b1521.firebasestorage.app",
  messagingSenderId: "657047208383",
  appId: "1:657047208383:web:c74b572518cf0e746f610a",
  measurementId: "G-S5ZL12567F"
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'recipe-hub-shared'; // Hardcoded so it stays identical across all devices

export default function App() {
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [groceryList, setGroceryList] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'add', 'pantry', 'planner', 'grocery'
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(true);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        if (error.code !== 'auth/configuration-not-found' && error.code !== 'auth/operation-not-allowed') {
           console.error("Auth error:", error);
        }
        // Fallback: If Anonymous Auth isn't enabled in Firebase Console, 
        // bypass it so the app still loads (works because DB is in Test Mode)
        setUser({ uid: 'unauthenticated-user' });
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        setUser(userAuth);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const recipesRef = collection(db, 'artifacts', appId, 'public', 'data', 'recipes');
    const unsubRecipes = onSnapshot(recipesRef, (snapshot) => {
      const fetchedRecipes = [];
      snapshot.forEach((doc) => {
        fetchedRecipes.push({ id: doc.id, ...doc.data() });
      });
      // Sort by newest first in memory (Rule 2: avoid complex firestore queries)
      fetchedRecipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecipes(fetchedRecipes);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoading(false);
    });

    const groceryRef = collection(db, 'artifacts', appId, 'public', 'data', 'groceryList');
    const unsubGrocery = onSnapshot(groceryRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      setGroceryList(items.sort((a,b) => b.createdAt - a.createdAt));
    });

    const plannerRef = collection(db, 'artifacts', appId, 'public', 'data', 'mealPlan');
    const unsubPlanner = onSnapshot(plannerRef, (snapshot) => {
      const plan = {};
      snapshot.forEach(doc => { plan[doc.id] = doc.data().recipeId; });
      setMealPlan(plan);
    });

    return () => { unsubRecipes(); unsubGrocery(); unsubPlanner(); };
  }, [user]);

  const handleShare = () => {
    const textArea = document.createElement("textarea");
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("App link copied! Send it to your husband to share this hub.");
    } catch (err) {
      showToast("Failed to copy link", "error");
    }
    document.body.removeChild(textArea);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const deleteRecipe = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id));
      showToast("Recipe deleted successfully");
    } catch (error) {
      showToast("Failed to delete recipe", "error");
    }
  };

  const updateRecipe = async (id, data) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'recipes', id), data);
    } catch (error) {
      showToast("Failed to update recipe", "error");
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans text-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <ChefHat className="w-12 h-12 text-slate-400 animate-pulse" />
          <p className="text-slate-500 font-medium tracking-wide">Warming up the kitchen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans selection:bg-orange-100 selection:text-orange-900">
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="bg-orange-100 p-2 rounded-xl">
                <ChefHat className="w-6 h-6 text-orange-600" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">Recipe Hub</span>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-3">
              <NavButton 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
                icon={<BookOpen className="w-4 h-4" />} 
                label="Recipes" 
              />
              <NavButton 
                active={activeTab === 'pantry'} 
                onClick={() => setActiveTab('pantry')} 
                icon={<Search className="w-4 h-4" />} 
                label="Pantry" 
              />
              <NavButton 
                active={activeTab === 'planner'} 
                onClick={() => setActiveTab('planner')} 
                icon={<Calendar className="w-4 h-4" />} 
                label="Plan" 
              />
              <NavButton 
                active={activeTab === 'grocery'} 
                onClick={() => setActiveTab('grocery')} 
                icon={<ShoppingCart className="w-4 h-4" />} 
                label="Groceries" 
              />
              <NavButton 
                active={activeTab === 'add'} 
                onClick={() => setActiveTab('add')} 
                icon={<PlusCircle className="w-4 h-4" />} 
                label="Add" 
                primary
              />
              <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
              <button 
                onClick={handleShare}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                title="Share Hub"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard recipes={recipes} onDelete={deleteRecipe} onUpdate={updateRecipe} />}
        {activeTab === 'add' && <AddRecipeForm onSuccess={() => setActiveTab('dashboard')} showToast={showToast} />}
        {activeTab === 'pantry' && <PantrySearch recipes={recipes} showToast={showToast} />}
        {activeTab === 'planner' && <MealPlanner recipes={recipes} mealPlan={mealPlan} showToast={showToast} />}
        {activeTab === 'grocery' && <GroceryList items={groceryList} showToast={showToast} />}
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
          <div className={`px-6 py-3 rounded-full shadow-lg text-sm font-medium flex items-center space-x-2 ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'
          }`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Navigation Button Component ---
function NavButton({ active, onClick, icon, label, primary }) {
  const baseClasses = "flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200";
  const activeClasses = primary 
    ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700" 
    : "bg-slate-100 text-slate-900";
  const inactiveClasses = primary
    ? "bg-slate-900 text-white hover:bg-slate-800"
    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// --- Dashboard Component ---
function Dashboard({ recipes, onDelete, onUpdate }) {
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterCookingType, setFilterCookingType] = useState('');
  const [filterProtein, setFilterProtein] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterFavs, setFilterFavs] = useState(false);

  if (recipes.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-10 h-10 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cookbook is empty</h2>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">Start adding your favorite recipes from around the web to build your personal collection.</p>
      </div>
    );
  }

  // Get unique values for filters
  const uniqueCuisines = [...new Set(recipes.map(r => r.cuisine).filter(Boolean))].sort();
  const uniqueCookingTypes = [...new Set(recipes.map(r => r.cookingType).filter(Boolean))].sort();
  const uniqueProteins = [...new Set(recipes.map(r => r.protein).filter(Boolean))].sort();

  // Apply filters
  const filteredRecipes = recipes.filter(recipe => {
    const timeMatch = filterTime === '' || 
                      (filterTime === '15' && recipe.prepTimeMinutes > 0 && recipe.prepTimeMinutes <= 15) ||
                      (filterTime === '30' && recipe.prepTimeMinutes > 0 && recipe.prepTimeMinutes <= 30) ||
                      (filterTime === '60' && recipe.prepTimeMinutes > 0 && recipe.prepTimeMinutes <= 60) ||
                      (filterTime === 'over60' && recipe.prepTimeMinutes > 60);

    const favMatch = filterFavs ? recipe.isFavorite : true;

    return (
      timeMatch && favMatch &&
      (filterCuisine === '' || recipe.cuisine === filterCuisine) &&
      (filterCookingType === '' || recipe.cookingType === filterCookingType) &&
      (filterProtein === '' || recipe.protein === filterProtein)
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">All Recipes</h1>
          <p className="text-slate-500 mt-1">You have {recipes.length} saved {recipes.length === 1 ? 'recipe' : 'recipes'}.</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center text-slate-400 pl-2">
            <Filter className="w-4 h-4" />
          </div>
          <select 
            value={filterCuisine} 
            onChange={(e) => setFilterCuisine(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2"
          >
            <option value="">All Cuisines</option>
            {uniqueCuisines.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            value={filterCookingType} 
            onChange={(e) => setFilterCookingType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2"
          >
            <option value="">All Cooking Types</option>
            {uniqueCookingTypes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            value={filterProtein} 
            onChange={(e) => setFilterProtein(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2"
          >
            <option value="">All Proteins</option>
            {uniqueProteins.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={filterTime} 
            onChange={(e) => setFilterTime(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2"
          >
            <option value="">Any Time</option>
            <option value="15">Under 15 mins</option>
            <option value="30">Under 30 mins</option>
            <option value="60">Under 1 hour</option>
            <option value="over60">Over 1 hour</option>
          </select>
          
          <button 
            onClick={() => setFilterFavs(!filterFavs)}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors flex items-center gap-1 ${filterFavs ? 'bg-orange-50 border-orange-200 text-orange-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            <Heart className={`w-4 h-4 ${filterFavs ? 'fill-orange-500 text-orange-500' : ''}`} />
            Favorites
          </button>

          {(filterCuisine || filterCookingType || filterProtein || filterTime || filterFavs) && (
            <button 
              onClick={() => { setFilterCuisine(''); setFilterCookingType(''); setFilterProtein(''); setFilterTime(''); setFilterFavs(false); }}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-500">No recipes match your selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onDelete={onDelete} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Recipe Card Component ---
function RecipeCard({ recipe, onDelete, onUpdate, matchData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFavorite = () => {
    if (onUpdate) onUpdate(recipe.id, { isFavorite: !recipe.isFavorite });
  };

  const setRating = (rating) => {
    if (onUpdate) onUpdate(recipe.id, { rating });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col group relative">
      
      {/* Top Actions: Delete & Favorite */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        <button 
          onClick={toggleFavorite}
          className={`p-2 backdrop-blur rounded-full transition-all duration-200 shadow-sm ${recipe.isFavorite ? 'bg-white text-orange-500 opacity-100' : 'bg-white/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-orange-500'}`}
          title={recipe.isFavorite ? "Unfavorite" : "Favorite"}
        >
          <Heart className={`w-4 h-4 ${recipe.isFavorite ? 'fill-current' : ''}`} />
        </button>
        <button 
          onClick={() => onDelete(recipe.id)}
          className="p-2 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
          title="Delete recipe"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      {recipe.imageUrl ? (
        <div className="h-48 w-full bg-slate-100 relative">
          <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-4 w-full bg-orange-100"></div>
      )}

      <div className="p-6 flex-grow">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.prepTimeMinutes > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {recipe.prepTimeMinutes} mins
            </span>
          )}
          {recipe.cuisine && (
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              {recipe.cuisine}
            </span>
          )}
          {recipe.protein && (
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider">
              {recipe.protein}
            </span>
          )}
          {recipe.cookingType && (
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold uppercase tracking-wider">
              {recipe.cookingType}
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1 leading-tight">
          {recipe.name}
        </h3>
        
        {/* Ratings */}
        {!matchData && (
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star} 
                onClick={() => setRating(star)}
                className={`focus:outline-none transition-colors ${recipe.rating >= star ? 'text-yellow-400' : 'text-slate-200 hover:text-yellow-200'}`}
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            ))}
          </div>
        )}

        {/* Ingredients Summary (if not in search mode) */}
        {!matchData && !isExpanded && (
          <p className="text-slate-500 text-sm line-clamp-3 mb-4">
            {recipe.ingredients.join(', ')}
          </p>
        )}

        {/* Expanded Recipe Details */}
        {isExpanded && (
          <div className="mt-4 border-t border-slate-100 pt-4 animate-fade-in mb-4">
            <h4 className="font-bold text-sm text-slate-800 mb-2">Ingredients</h4>
            <ul className="list-disc pl-5 text-sm text-slate-600 mb-6 space-y-1">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="capitalize">{ing}</li>
              ))}
            </ul>
            
            {recipe.instructions && (
              <>
                <h4 className="font-bold text-sm text-slate-800 mb-2">Instructions</h4>
                <div className="text-sm text-slate-600 space-y-2 whitespace-pre-wrap leading-relaxed">
                  {recipe.instructions}
                </div>
              </>
            )}
          </div>
        )}

        {/* Match Data (Only shown in Pantry Search) */}
        {matchData && (
          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Match Result</span>
              <span className={`text-lg font-bold ${matchData.matchScore >= 0.7 ? 'text-emerald-600' : matchData.matchScore >= 0.4 ? 'text-amber-500' : 'text-slate-600'}`}>
                {Math.round(matchData.matchScore * 100)}%
              </span>
            </div>
            
            <div className="space-y-3 text-sm">
              {matchData.matched.length > 0 && (
                <div>
                  <p className="text-emerald-700 font-medium mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> You have:
                  </p>
                  <p className="text-slate-600 pl-5">{matchData.matched.join(', ')}</p>
                </div>
              )}
              {matchData.missing.length > 0 && (
                <div>
                  <p className="text-red-500 font-medium mb-1 flex items-center gap-1">
                    <Circle className="w-4 h-4" /> Missing:
                  </p>
                  <p className="text-slate-600 pl-5">{matchData.missing.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!matchData && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center justify-center space-x-1 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors w-full py-2 bg-orange-50 rounded-xl"
          >
            <span>{isExpanded ? 'Show Less' : 'View Recipe Details'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Footer / Link */}
      {recipe.url && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 mt-auto">
          <a 
            href={recipe.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors"
          >
            <span>View Original Recipe</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

// --- Add Recipe Form Component ---
function AddRecipeForm({ onSuccess, showToast }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [importMode, setImportMode] = useState('search'); // 'search', 'image', 'text'
  const [searchQuery, setSearchQuery] = useState('');
  const [rawText, setRawText] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    imageUrl: '',
    cuisine: '',
    cookingType: '',
    protein: '',
    prepTimeMinutes: '',
    ingredients: '',
    instructions: ''
  });

  const getGeminiPayload = (mode, data) => {
    const schema = {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "A short, catchy name for the recipe." },
        cuisine: { type: "STRING", description: "The cuisine type (e.g., Japanese, Italian). Leave blank if unknown." },
        cookingType: { type: "STRING", description: "The primary cooking method (e.g., Bake, Fry, Steam, Stew). Leave blank if unknown." },
        protein: { type: "STRING", description: "The main protein (e.g., Chicken, Beef, Pork, Tofu). Leave blank if none." },
        prepTimeMinutes: { type: "INTEGER", description: "Total estimated time to prep and cook in minutes. Return just the number." },
        imageUrl: { type: "STRING", description: "If the source text contains an image URL for the dish, extract it here." },
        ingredients: { type: "ARRAY", items: { type: "STRING" }, description: "List of simple ingredient names (no measurements, just the item like 'chicken breast' or 'soy sauce')." },
        instructions: { type: "ARRAY", items: { type: "STRING" }, description: "Step-by-step cooking instructions." }
      },
      required: ["name", "ingredients"]
    };

    let payload = {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };

    if (mode === 'search') {
      payload.contents = [{ parts: [{ text: `Search the web to find the recipe for: "${data}". Extract the full ingredients and step-by-step instructions.` }] }];
      payload.tools = [{ google_search: {} }];
    } else if (mode === 'text') {
      payload.contents = [{ parts: [{ text: `Analyze the following recipe text/caption and extract the details: ${data}` }] }];
    } else if (mode === 'image') {
      payload.contents = [{
        role: "user",
        parts: [
          { text: "Extract the recipe name, ingredients, and instructions from this image." },
          { inlineData: { mimeType: data.mimeType, data: data.base64 } }
        ]
      }];
    }

    return payload;
  };

  const executeAiParse = async (mode, data, sourceUrl = '') => {
    setIsAiLoading(true);
    try {
      const payload = getGeminiPayload(mode, data);
      
      // 👇 PASTE YOUR GOOGLE AI KEY HERE 👇
      const apiKey = "AQ.Ab8RN6KIuyQoECqn4sl5QzEJhPmSjHNMl40YAHRo1gSwTVnlMA"; 
      // 👆 PASTE YOUR GOOGLE AI KEY HERE 👆

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
        const parsedData = JSON.parse(result.candidates[0].content.parts[0].text);
        
        // If it was a search, try to extract the source URL from grounding metadata
        let foundUrl = sourceUrl;
        if (mode === 'search' && result.candidates[0].groundingMetadata?.groundingAttributions?.length > 0) {
           const attributions = result.candidates[0].groundingMetadata.groundingAttributions;
           const webSource = attributions.find(attr => attr.web?.uri);
           if (webSource) foundUrl = webSource.web.uri;
        }

        setFormData(prev => ({
          ...prev,
          name: parsedData.name || prev.name,
          url: foundUrl || prev.url,
          imageUrl: parsedData.imageUrl || prev.imageUrl,
          cuisine: parsedData.cuisine || prev.cuisine,
          cookingType: parsedData.cookingType || prev.cookingType,
          protein: parsedData.protein || prev.protein,
          prepTimeMinutes: parsedData.prepTimeMinutes || prev.prepTimeMinutes,
          ingredients: parsedData.ingredients ? parsedData.ingredients.join('\n') : prev.ingredients,
          instructions: parsedData.instructions ? parsedData.instructions.join('\n\n') : prev.instructions
        }));
        showToast("Recipe details auto-filled successfully!");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("AI parsing error:", error);
      showToast("Could not extract recipe details. You may need to enter it manually.", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleWebSearch = () => {
    if (!searchQuery.trim()) {
      showToast("Please enter a recipe or creator name.", "error");
      return;
    }
    executeAiParse('search', searchQuery);
  };

  const handleTextPaste = () => {
    if (!rawText.trim()) {
      showToast("Please paste some text first.", "error");
      return;
    }
    executeAiParse('text', rawText);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Must be an image
    if (!file.type.startsWith('image/')) {
      showToast("Please upload a valid image file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      executeAiParse('image', { mimeType: file.type, base64: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ingredients) {
      showToast("Name and Ingredients are required", "error");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Process ingredients: split by comma or newline, trim, lowercase, remove empty
      const ingredientsList = formData.ingredients
        .split(/,|\n/)
        .map(i => i.trim().toLowerCase())
        .filter(i => i.length > 0);

      const newRecipe = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        imageUrl: formData.imageUrl.trim(),
        cuisine: formData.cuisine.trim(),
        cookingType: formData.cookingType.trim(),
        protein: formData.protein.trim(),
        prepTimeMinutes: Number(formData.prepTimeMinutes) || 0,
        ingredients: ingredientsList,
        instructions: formData.instructions.trim(),
        isFavorite: false,
        rating: 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'recipes'), newRecipe);
      
      showToast("Recipe added successfully!");
      onSuccess(); // Switch back to dashboard
    } catch (error) {
      console.error("Error adding recipe:", error);
      showToast("Failed to add recipe", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Add a New Recipe</h2>
        <p className="text-slate-500 mt-1">Use our smart tools to import, or type it in manually.</p>
      </div>

      {/* Smart Import Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 mb-8">
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-4">
          <button 
            onClick={() => setImportMode('search')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${importMode === 'search' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Globe className="w-4 h-4" /> Web Search
          </button>
          <button 
            onClick={() => setImportMode('image')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${importMode === 'image' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <ImageIcon className="w-4 h-4" /> Screenshot
          </button>
          <button 
            onClick={() => setImportMode('text')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${importMode === 'text' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <FileText className="w-4 h-4" /> Paste Text
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-inner">
          {importMode === 'search' && (
            <div className="animate-fade-in">
              <p className="text-sm text-slate-600 mb-3">Best for TikTok/IG videos. Enter the recipe name and creator, and AI will search the web for their official written recipe.</p>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Spicy Vodka Pasta by Gigi Hadid"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-3 text-sm"
              />
              <button
                onClick={handleWebSearch}
                disabled={isAiLoading || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full"
              >
                {isAiLoading ? 'Searching the web...' : 'Search & Extract'}
              </button>
            </div>
          )}

          {importMode === 'image' && (
            <div className="animate-fade-in">
              <p className="text-sm text-slate-600 mb-3">Take a screenshot of the video showing the ingredients or instructions and upload it here.</p>
              <input 
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isAiLoading}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer mb-3"
              />
              {isAiLoading && (
                <div className="text-center text-sm font-semibold text-emerald-600 py-2">
                  Scanning image...
                </div>
              )}
            </div>
          )}

          {importMode === 'text' && (
            <div className="animate-fade-in">
              <p className="text-sm text-slate-600 mb-3">Paste a video caption, a block of text, or YouTube description here.</p>
              <textarea 
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={3}
                placeholder="Paste recipe text here..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none mb-3 text-sm"
              />
              <button
                onClick={handleTextPaste}
                disabled={isAiLoading || !rawText.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full"
              >
                {isAiLoading ? 'Analyzing...' : 'Extract from Text'}
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Recipe Name *</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange}
            placeholder="e.g., Spicy Miso Ramen"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Recipe Link / URL</label>
          <input 
            type="url" 
            name="url" 
            value={formData.url} 
            onChange={handleChange}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Image URL</label>
          <input 
            type="url" 
            name="imageUrl" 
            value={formData.imageUrl} 
            onChange={handleChange}
            placeholder="https://.../image.jpg"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Cuisine</label>
            <input 
              type="text" 
              name="cuisine" 
              value={formData.cuisine} 
              onChange={handleChange}
              placeholder="e.g., Japanese"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Cooking Type</label>
            <input 
              type="text" 
              name="cookingType" 
              value={formData.cookingType} 
              onChange={handleChange}
              placeholder="e.g., Braise, Steam"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Protein</label>
            <input 
              type="text" 
              name="protein" 
              value={formData.protein} 
              onChange={handleChange}
              placeholder="e.g., Pork, Tofu"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Time (mins)</label>
            <input 
              type="number" 
              name="prepTimeMinutes" 
              value={formData.prepTimeMinutes} 
              onChange={handleChange}
              placeholder="e.g., 30"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ingredients *</label>
          <p className="text-xs text-slate-500 mb-2">Separate ingredients with commas or new lines. Keep them simple for better pantry matching (e.g., "chicken, soy sauce, garlic").</p>
          <textarea 
            name="ingredients" 
            value={formData.ingredients} 
            onChange={handleChange}
            rows={5}
            placeholder="chicken&#10;soy sauce&#10;garlic&#10;ginger"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Instructions</label>
          <p className="text-xs text-slate-500 mb-2">Step-by-step instructions for cooking this recipe.</p>
          <textarea 
            name="instructions" 
            value={formData.instructions} 
            onChange={handleChange}
            rows={6}
            placeholder="1. Chop the vegetables...&#10;2. Heat the pan..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-md transition-colors disabled:opacity-70 flex items-center space-x-2"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" />
                <span>Save Recipe</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Pantry Search Component ---
function PantrySearch({ recipes, showToast }) {
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState(null);

  const handleSearch = () => {
    if (!searchInput.trim()) {
      setResults(null);
      return;
    }

    // Process user's ingredients
    const myIngredients = searchInput
      .split(/,|\n/)
      .map(i => i.trim().toLowerCase())
      .filter(i => i.length > 2); // Ignore very short words to prevent false positives

    if (myIngredients.length === 0) return;

    // Calculate matches for each recipe
    const processedRecipes = recipes.map(recipe => {
      let matched = [];
      let missing = [];

      recipe.ingredients.forEach(reqIng => {
        // A simple partial match: Does the required ingredient contain any of my ingredients? 
        // OR Does my ingredient contain the required ingredient?
        const isMatch = myIngredients.some(myIng => 
          reqIng.includes(myIng) || myIng.includes(reqIng)
        );

        if (isMatch) {
          matched.push(reqIng);
        } else {
          missing.push(reqIng);
        }
      });

      const totalIngredients = recipe.ingredients.length;
      const matchScore = totalIngredients > 0 ? (matched.length / totalIngredients) : 0;

      return {
        ...recipe,
        matchData: { matched, missing, matchScore }
      };
    });

    // Filter out recipes with 0 matches and sort by highest match score
    const filteredAndSorted = processedRecipes
      .filter(r => r.matchData.matched.length > 0)
      .sort((a, b) => b.matchData.matchScore - a.matchData.matchScore);

    setResults(filteredAndSorted);
  };

  const addMissingToGrocery = async (missingIngredients) => {
    try {
      const promises = missingIngredients.map(ing => 
        addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'groceryList'), {
          text: ing,
          checked: false,
          createdAt: Date.now()
        })
      );
      await Promise.all(promises);
      showToast(`Added ${missingIngredients.length} item(s) to grocery list!`);
    } catch (error) {
      showToast("Failed to add to grocery list", "error");
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      
      {/* Search Header Area */}
      <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What's in your fridge?</h2>
          <p className="text-slate-300 mb-8">Enter the ingredients you have on hand, separated by commas, and we'll find recipes you can make right now.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-2 rounded-2xl md:rounded-full focus-within:ring-4 focus-within:ring-orange-500/30 transition-all">
            <input 
              type="text" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g., chicken, rice, soy sauce, eggs"
              className="flex-grow px-4 py-3 bg-transparent text-slate-900 placeholder-slate-400 outline-none rounded-full"
            />
            <button 
              onClick={handleSearch}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl md:rounded-full font-bold transition-colors flex justify-center items-center gap-2"
            >
              <Search className="w-5 h-5" />
              <span>Find Meals</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Area */}
      {results && (
        <div className="mt-12">
          <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-4">
            <h3 className="text-2xl font-bold text-slate-900">
              {results.length > 0 ? 'Suggested Recipes' : 'No matches found'}
            </h3>
            {results.length > 0 && (
              <p className="text-slate-500 font-medium">{results.length} results sorted by best match</p>
            )}
          </div>
          
          {results.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {results.map(recipe => (
               <div key={recipe.id} className="relative">
                 <RecipeCard recipe={recipe} onDelete={() => {}} matchData={recipe.matchData} />
                 {recipe.matchData.missing.length > 0 && (
                   <button 
                     onClick={() => addMissingToGrocery(recipe.matchData.missing)}
                     className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                   >
                     <ShoppingCart className="w-4 h-4" /> Add Missing to List
                   </button>
                 )}
               </div>
             ))}
           </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-500 mb-2">We couldn't find any recipes matching those ingredients.</p>
              <p className="text-sm text-slate-400">Try entering fewer ingredients or check out your full recipe list.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Grocery List Component ---
function GroceryList({ items, showToast }) {
  const [newItem, setNewItem] = useState('');

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'groceryList'), {
        text: newItem.trim(),
        checked: false,
        createdAt: Date.now()
      });
      setNewItem('');
    } catch (error) {
      showToast("Failed to add item", "error");
    }
  };

  const toggleItem = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groceryList', id), {
        checked: !currentStatus
      });
    } catch (error) {
      console.error(error);
    }
  };

  const clearCompleted = async () => {
    const completed = items.filter(i => i.checked);
    try {
      await Promise.all(completed.map(item => 
        deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groceryList', item.id))
      ));
      showToast("Cleared completed items!");
    } catch (error) {
      showToast("Failed to clear items", "error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Grocery List</h2>
          <p className="text-slate-500 mt-1">Items added from your pantry searches and custom entries.</p>
        </div>
        {items.some(i => i.checked) && (
          <button 
            onClick={clearCompleted}
            className="text-sm text-red-500 hover:text-red-700 font-semibold"
          >
            Clear Completed
          </button>
        )}
      </div>

      <form onSubmit={addItem} className="mb-6 flex gap-2">
        <input 
          type="text" 
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add a custom item..."
          className="flex-grow px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
        />
        <button type="submit" className="bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-slate-800 transition-colors">
          Add
        </button>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Your list is empty!
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${item.checked ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
              <button 
                onClick={() => toggleItem(item.id, item.checked)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-orange-500'}`}
              >
                {item.checked && <Check className="w-4 h-4 text-white" />}
              </button>
              <span className={`flex-grow font-medium ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {item.text}
              </span>
              <button 
                onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groceryList', item.id))}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- Meal Planner Component ---
function MealPlanner({ recipes, mealPlan, showToast }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const assignRecipe = async (day, recipeId) => {
    try {
      if (recipeId === '') {
         await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mealPlan', day));
      } else {
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mealPlan', day), { recipeId });
      }
    } catch (error) {
      showToast("Failed to update meal plan", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Weekly Meal Planner</h2>
        <p className="text-slate-500 mt-1">Assign your saved recipes to days of the week.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {days.map(day => {
          const selectedRecipeId = mealPlan[day] || '';
          const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

          return (
            <div key={day} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col h-full min-h-[160px]">
              <h3 className="font-bold text-slate-700 mb-3">{day}</h3>
              
              {selectedRecipe ? (
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex-grow flex flex-col relative group">
                  {selectedRecipe.imageUrl && (
                    <div className="h-24 -mx-3 -mt-3 mb-3 rounded-t-xl overflow-hidden bg-slate-100">
                      <img src={selectedRecipe.imageUrl} alt={selectedRecipe.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="font-bold text-sm text-slate-900 leading-tight mb-2">{selectedRecipe.name}</p>
                  
                  <div className="mt-auto flex justify-between items-center pt-2">
                     <span className="text-xs font-semibold px-2 py-1 bg-orange-50 text-orange-700 rounded-md">
                       {selectedRecipe.prepTimeMinutes ? `${selectedRecipe.prepTimeMinutes}m` : 'N/A'}
                     </span>
                     <button 
                        onClick={() => assignRecipe(day, '')}
                        className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                      >
                        Remove
                     </button>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col justify-center">
                  <select 
                    value=""
                    onChange={(e) => assignRecipe(day, e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 text-slate-600 rounded-xl p-2 outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="" disabled>+ Plan a meal</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}