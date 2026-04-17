import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
} from "@reduxjs/toolkit";

// --------------------------------
// 1. Entity Adapter for Todos (normalized state)
// --------------------------------
const todosAdapter = createEntityAdapter({
  selectId: (todo) => todo.id,
  sortComparer: (a, b) => a.createdAt - b.createdAt, // oldest first
});

// --------------------------------
// 2. Initial State (rich & modular)
// --------------------------------
const initialState = {
  // User info
  user: {
    id: null,
    name: "",
    email: "",
    avatar: null,
    preferences: {
      theme: "light",
      notifications: true,
      weeklyReport: true,
    },
  },
  onboarded: false,
  plan: null, // 'free', 'pro', 'premium'
  focus: "Mindful breathing", // current focus goal

  // Normalized todos
  todos: todosAdapter.getInitialState({
    // extra entity state fields (if any)
  }),

  // Statistics & gamification
  stats: {
    streak: 0, // current daily streak
    longestStreak: 0,
    totalSessions: 0,
    lastActiveDate: null, // ISO string
    totalTodosCompleted: 0,
  },
  achievements: [
    { id: "first_todo", name: "First Step", unlocked: false, condition: 1 },
    { id: "streak_7", name: "Weekly Warrior", unlocked: false, condition: 7 },
    { id: "streak_30", name: "Monthly Master", unlocked: false, condition: 30 },
    { id: "todo_50", name: "Half Century", unlocked: false, condition: 50 },
  ],

  // Async statuses
  loading: false,
  error: null,
};

// --------------------------------
// 3. Async Thunks (simulated API calls)
// --------------------------------

// Fetch user profile & todos from backend
export const fetchUserData = createAsyncThunk(
  "user/fetchUserData",
  async (userId, { rejectWithValue }) => {
    try {
      // Simulate API call
      const response = await new Promise((resolve) =>
        setTimeout(() => {
          resolve({
            user: {
              id: userId,
              name: "Alex Johnson",
              email: "alex@example.com",
              preferences: {
                theme: "dark",
                notifications: true,
                weeklyReport: true,
              },
            },
            onboarded: true,
            plan: "pro",
            focus: "Deep breathing",
            todos: [
              {
                id: "1",
                text: "Morning meditation",
                done: false,
                priority: "high",
                dueDate: null,
                createdAt: Date.now() - 86400000,
              },
              {
                id: "2",
                text: "Drink 3L water",
                done: true,
                priority: "medium",
                dueDate: null,
                createdAt: Date.now() - 43200000,
              },
              {
                id: "3",
                text: "Journal for 5 min",
                done: false,
                priority: "low",
                dueDate: Date.now() + 3600000,
                createdAt: Date.now(),
              },
            ],
            stats: {
              streak: 5,
              longestStreak: 12,
              totalSessions: 42,
              lastActiveDate: new Date().toISOString(),
              totalTodosCompleted: 27,
            },
          });
        }, 800),
      );
      return response;
    } catch (err) {
      return rejectWithValue("Failed to fetch user data");
    }
  },
);

// Sync todos with server (optimistic update pattern)
export const syncTodos = createAsyncThunk(
  "user/syncTodos",
  async (todos, { rejectWithValue }) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Assume server accepts the todos array
      return { success: true, syncedTodos: todos };
    } catch (err) {
      return rejectWithValue("Sync failed");
    }
  },
);

// --------------------------------
// 4. Slice Definition
// --------------------------------
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // ---- User & Onboarding ----
    setUser: (state, action) => {
      const p = action.payload;
      if (p == null) {
        return;
      }
      if (typeof p !== "object") {
        return;
      }
      if (p.onboarded !== undefined) {
        state.onboarded = !!p.onboarded;
      }
      if (p.plan !== undefined) {
        state.plan = p.plan;
      }
      const { onboarded, plan, ...profile } = p;
      state.user = { ...state.user, ...profile };
    },
    completeOnboarding: (state, action) => {
      state.onboarded = true;
      state.plan = action.payload; // e.g., 'free'
    },
    updatePreferences: (state, action) => {
      state.user.preferences = { ...state.user.preferences, ...action.payload };
    },

    // ---- Focus ----
    setFocus: (state, action) => {
      state.focus = action.payload;
    },

    // ---- Advanced Todo Operations (using entity adapter) ----
    addTodo: {
      reducer: (state, action) => {
        todosAdapter.addOne(state.todos, action.payload);
      },
      prepare: (text, priority = "medium", dueDate = null) => {
        return {
          payload: {
            id: Date.now().toString(),
            text,
            done: false,
            priority, // 'low', 'medium', 'high'
            dueDate,
            createdAt: Date.now(),
          },
        };
      },
    },
    toggleTodo: (state, action) => {
      const todo = state.todos.entities[action.payload];
      if (todo) {
        todo.done = !todo.done;
        // Update stats if todo was completed
        if (todo.done) {
          state.stats.totalTodosCompleted += 1;
          // Check for achievement unlocking (first todo)
          checkAndUnlockAchievements(state);
        } else {
          state.stats.totalTodosCompleted -= 1;
        }
      }
    },
    updateTodo: (state, action) => {
      const { id, changes } = action.payload;
      todosAdapter.updateOne(state.todos, { id, changes });
    },
    deleteTodo: (state, action) => {
      const todo = state.todos.entities[action.payload];
      if (todo && todo.done) {
        state.stats.totalTodosCompleted -= 1;
      }
      todosAdapter.removeOne(state.todos, action.payload);
    },
    reorderTodos: (state, action) => {
      const { startIndex, endIndex } = action.payload;
      const allTodos = Object.values(state.todos.entities);
      const [removed] = allTodos.splice(startIndex, 1);
      allTodos.splice(endIndex, 0, removed);
      // Reset and re-add in new order
      state.todos.ids = allTodos.map((t) => t.id);
    },
    batchToggleTodos: (state, action) => {
      const { ids, done } = action.payload;
      ids.forEach((id) => {
        const todo = state.todos.entities[id];
        if (todo && todo.done !== done) {
          todo.done = done;
          state.stats.totalTodosCompleted += done ? 1 : -1;
        }
      });
      checkAndUnlockAchievements(state);
    },

    // ---- Streak & Activity ----
    recordDailyActivity: (state) => {
      const today = new Date().toISOString().split("T")[0];
      const lastActive = state.stats.lastActiveDate?.split("T")[0];
      if (lastActive === today) return; // already recorded today

      let newStreak = 1;
      if (lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        if (lastActive === yesterdayStr) {
          newStreak = state.stats.streak + 1;
        }
      }
      state.stats.streak = newStreak;
      if (newStreak > state.stats.longestStreak) {
        state.stats.longestStreak = newStreak;
      }
      state.stats.lastActiveDate = new Date().toISOString();
      state.stats.totalSessions += 1;
      checkAndUnlockAchievements(state);
    },

    // ---- Achievements ----
    unlockAchievement: (state, action) => {
      const achievement = state.achievements.find(
        (a) => a.id === action.payload,
      );
      if (achievement && !achievement.unlocked) {
        achievement.unlocked = true;
      }
    },

    // ---- Reset / Logout ----
    resetUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchUserData
      .addCase(fetchUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.loading = false;
        const { user, onboarded, plan, focus, todos, stats } = action.payload;
        state.user = user;
        state.onboarded = onboarded;
        state.plan = plan;
        state.focus = focus;
        todosAdapter.setAll(state.todos, todos);
        state.stats = { ...state.stats, ...stats };
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // syncTodos (optimistic update: we already updated UI, just handle success/failure)
      .addCase(syncTodos.pending, (state) => {
        // optional: set a syncing flag
      })
      .addCase(syncTodos.fulfilled, (state) => {
        // all good, nothing else needed
      })
      .addCase(syncTodos.rejected, (state, action) => {
        state.error = action.payload;
        // Rollback: In a real app you would revert to previous todos state
        // This is simplified; you'd store a snapshot before optimistic update
        console.warn("Sync failed, consider rolling back");
      });
  },
});

// Helper: Check and unlock achievements based on current stats
function checkAndUnlockAchievements(state) {
  const totalCompleted = state.stats.totalTodosCompleted;
  const streak = state.stats.streak;

  state.achievements.forEach((ach) => {
    if (ach.unlocked) return;
    if (
      (ach.id === "first_todo" && totalCompleted >= ach.condition) ||
      (ach.id === "streak_7" && streak >= ach.condition) ||
      (ach.id === "streak_30" && streak >= ach.condition) ||
      (ach.id === "todo_50" && totalCompleted >= ach.condition)
    ) {
      ach.unlocked = true;
    }
  });
}

// --------------------------------
// 5. Memoized Selectors
// --------------------------------
export const selectUserState = (state) => state.user;
export const selectTodos = (state) => state.user.todos;
export const selectTodosArray = createSelector([selectTodos], (todosState) =>
  Object.values(todosState.entities),
);
export const selectCompletedTodos = createSelector(
  [selectTodosArray],
  (todos) => todos.filter((todo) => todo.done),
);
export const selectIncompleteTodos = createSelector(
  [selectTodosArray],
  (todos) => todos.filter((todo) => !todo.done),
);
export const selectTodosByPriority = createSelector(
  [selectTodosArray, (state, priority) => priority],
  (todos, priority) => todos.filter((todo) => todo.priority === priority),
);
export const selectCompletionPercentage = createSelector(
  [selectTodosArray],
  (todos) => {
    if (todos.length === 0) return 0;
    const completedCount = todos.filter((t) => t.done).length;
    return Math.round((completedCount / todos.length) * 100);
  },
);
export const selectStreak = (state) => state.user.stats.streak;
export const selectUnlockedAchievements = createSelector(
  [(state) => state.user.achievements],
  (achievements) => achievements.filter((a) => a.unlocked),
);
export const selectLoading = (state) => state.user.loading;
export const selectError = (state) => state.user.error;

// Export actions and reducer
export const {
  setUser,
  completeOnboarding,
  updatePreferences,
  setFocus,
  addTodo,
  toggleTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
  batchToggleTodos,
  recordDailyActivity,
  unlockAchievement,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;
