// dataSlice.js
import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
} from "@reduxjs/toolkit";

// ----------------------------------------------------------------------
// 1. Entity adapter for normalized state (ids + entities)
// ----------------------------------------------------------------------
const itemsAdapter = createEntityAdapter({
  // Assume each item has a unique `id` field
  selectId: (item) => item.id,
  // Optional: keep items sorted by a field (e.g., createdAt descending)
  sortComparer: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
});

// ----------------------------------------------------------------------
// 2. Async thunks (replace with real API calls)
// ----------------------------------------------------------------------

// Helper: generic fetch with AbortController for cancellation
const createAbortableThunk = (type, apiCall) =>
  createAsyncThunk(type, async (arg, { signal, rejectWithValue }) => {
    try {
      return await apiCall(arg, { signal });
    } catch (err) {
      if (err.name === "AbortError") {
        return rejectWithValue("Request cancelled");
      }
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  });

// Fetch items with pagination, filtering, and optional sync timestamp
export const fetchItems = createAbortableThunk(
  "data/fetchItems",
  async ({ page = 1, limit = 10, query = "" }, { signal }) => {
    // Example API call – replace with your actual endpoint
    const response = await fetch(
      `/api/items?page=${page}&limit=${limit}&q=${encodeURIComponent(query)}`,
      { signal },
    );
    if (!response.ok) throw new Error("Failed to fetch items");
    const data = await response.json();
    // Expected response shape: { items: [], total: number }
    return { items: data.items, total: data.total, page, limit, query };
  },
);

// Add a new item
export const addItem = createAsyncThunk(
  "data/addItem",
  async (newItem, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) throw new Error("Failed to add item");
      const createdItem = await response.json();
      return createdItem;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// Update an existing item
export const updateItem = createAsyncThunk(
  "data/updateItem",
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error("Failed to update item");
      const updatedItem = await response.json();
      return updatedItem;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// Delete an item
export const deleteItem = createAsyncThunk(
  "data/deleteItem",
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete item");
      return id; // return the deleted id for removal from state
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// Manual sync: fetch all items (or since lastSync) and update state
export const syncItems = createAsyncThunk(
  "data/syncItems",
  async (_, { getState, rejectWithValue }) => {
    const { lastSync } = getState().data;
    try {
      const url = lastSync
        ? `/api/items/sync?since=${lastSync}`
        : "/api/items/sync";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Sync failed");
      const data = await response.json();
      // data.shape: { items: [], lastSync: newTimestamp }
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// ----------------------------------------------------------------------
// 3. Initial state (adapter + extra fields)
// ----------------------------------------------------------------------
const initialState = itemsAdapter.getInitialState({
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  lastSync: null, // timestamp of last successful sync
  syncStatus: "idle", // separate status for sync thunk
  // Pagination & filter state
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 0,
  searchQuery: "",
});

// ----------------------------------------------------------------------
// 4. Slice with reducers + extraReducers for async thunks
// ----------------------------------------------------------------------
const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    // Manual setter (if you still need the original action)
    setItems: (state, action) => {
      itemsAdapter.setAll(state, action.payload);
    },
    setLastSync: (state, action) => {
      state.lastSync = action.payload;
    },
    // Clear all items
    clearItems: (state) => {
      itemsAdapter.removeAll(state);
    },
    // Reset status/error
    resetStatus: (state) => {
      state.status = "idle";
      state.error = null;
    },
    // Optimistic update example (for offline support)
    optimisticAddItem: (state, action) => {
      itemsAdapter.addOne(state, { ...action.payload, isOptimistic: true });
    },
    // Update pagination & filters locally
    setPagination: (state, action) => {
      const { page, limit } = action.payload;
      if (page !== undefined) state.currentPage = page;
      if (limit !== undefined) state.itemsPerPage = limit;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      // Reset to page 1 when search changes
      state.currentPage = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------- fetchItems ----------
      .addCase(fetchItems.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        const { items, total, page, limit, query } = action.payload;
        itemsAdapter.setAll(state, items);
        state.totalItems = total;
        state.currentPage = page;
        state.itemsPerPage = limit;
        state.searchQuery = query || "";
        state.status = "succeeded";
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      // ---------- addItem ----------
      .addCase(addItem.pending, (state) => {
        // Optional: set a specific "adding" status
      })
      .addCase(addItem.fulfilled, (state, action) => {
        itemsAdapter.addOne(state, action.payload);
        // If you maintain total count and the list is unfiltered, increment totalItems
        if (!state.searchQuery) state.totalItems += 1;
      })
      .addCase(addItem.rejected, (state, action) => {
        state.error = action.payload;
      })
      // ---------- updateItem ----------
      .addCase(updateItem.fulfilled, (state, action) => {
        itemsAdapter.updateOne(state, {
          id: action.payload.id,
          changes: action.payload,
        });
      })
      .addCase(updateItem.rejected, (state, action) => {
        state.error = action.payload;
      })
      // ---------- deleteItem ----------
      .addCase(deleteItem.fulfilled, (state, action) => {
        itemsAdapter.removeOne(state, action.payload);
        if (!state.searchQuery) state.totalItems -= 1;
      })
      .addCase(deleteItem.rejected, (state, action) => {
        state.error = action.payload;
      })
      // ---------- syncItems ----------
      .addCase(syncItems.pending, (state) => {
        state.syncStatus = "loading";
      })
      .addCase(syncItems.fulfilled, (state, action) => {
        const { items, lastSync: newSyncTimestamp } = action.payload;
        // For sync, we typically merge or replace items. Here we replace all.
        itemsAdapter.setAll(state, items);
        state.lastSync = newSyncTimestamp;
        state.syncStatus = "succeeded";
      })
      .addCase(syncItems.rejected, (state, action) => {
        state.syncStatus = "failed";
        state.error = action.payload;
      });
  },
});

// ----------------------------------------------------------------------
// 5. Export actions and reducer
// ----------------------------------------------------------------------
export const {
  setItems,
  setLastSync,
  clearItems,
  resetStatus,
  optimisticAddItem,
  setPagination,
  setSearchQuery,
} = dataSlice.actions;

export default dataSlice.reducer;

// ----------------------------------------------------------------------
// 6. Memoized selectors (advanced)
// ----------------------------------------------------------------------

// Base selectors
const selectDataState = (state) => state.data; // adjust based on your store structure
const {
  selectAll: selectAllItems,
  selectById: selectItemById,
  selectIds: selectItemIds,
} = itemsAdapter.getSelectors(selectDataState);

// Additional selectors
export const selectItemsStatus = (state) => state.data.status;
export const selectItemsError = (state) => state.data.error;
export const selectLastSync = (state) => state.data.lastSync;
export const selectSyncStatus = (state) => state.data.syncStatus;
export const selectCurrentPage = (state) => state.data.currentPage;
export const selectItemsPerPage = (state) => state.data.itemsPerPage;
export const selectTotalItems = (state) => state.data.totalItems;
export const selectSearchQuery = (state) => state.data.searchQuery;

// Derived: paginated items (based on current page & items per page from state)
export const selectPaginatedItems = createSelector(
  [selectAllItems, selectCurrentPage, selectItemsPerPage],
  (items, page, limit) => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return items.slice(start, end);
  },
);

// Derived: whether there are more pages
export const selectHasMorePages = createSelector(
  [selectTotalItems, selectCurrentPage, selectItemsPerPage],
  (total, page, limit) => page * limit < total,
);

// Derived: filtered items (by search query) – you can combine with pagination
export const selectFilteredItems = createSelector(
  [selectAllItems, selectSearchQuery],
  (items, query) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery),
    );
  },
);

// Derived: filtered + paginated items (for a searchable, paginated list)
export const selectFilteredPaginatedItems = createSelector(
  [selectFilteredItems, selectCurrentPage, selectItemsPerPage],
  (filteredItems, page, limit) => {
    const start = (page - 1) * limit;
    return filteredItems.slice(start, start + limit);
  },
);

// Derived: total filtered count
export const selectFilteredTotal = createSelector(
  [selectFilteredItems],
  (filteredItems) => filteredItems.length,
);
