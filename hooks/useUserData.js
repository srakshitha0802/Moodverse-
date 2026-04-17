import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { setUser, resetUserState } from "../slices/userSlice";

import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setUser, resetUserState } from "../slices/userSlice";

const USER_KEY = "@Moodverse:User";
const USER_VERSION_KEY = "@Moodverse:UserVersion";
const USER_VERSION = 2;
const LOAD_TIMEOUT = 1000; // 1s max block

// FAST skeleton - unblocks UI immediately
const SKELETON_USER = {
  id: null,
  name: "",
  email: "",
  onboarded: false,
  plan: "free",
  preferences: {},
  createdAt: new Date().toISOString(),
  updatedAt: null,
  version: USER_VERSION,
};

function normalizeUser(raw) {
  const base = raw && typeof raw === "object" ? { ...raw } : {};
  return {
    ...SKELETON_USER,
    ...base,
    onboarded: !!base.onboarded,
    plan: ["free", "premium", "trial", "pro"].includes(base.plan) ? base.plan : "free",
    preferences: base.preferences && typeof base.preferences === "object" ? base.preferences : {},
    version: typeof base.version === "number" ? base.version : USER_VERSION,
  };
}

export const useUserData = () => {
  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.user);
  
  const [loading, setLoading] = useState(true);
  const [writeLoading, setWriteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [writeError, setWriteError] = useState(null);

  // Skeleton immediately → real data races in parallel
  useEffect(() => {
    dispatch(setUser(SKELETON_USER));
    setLoading(true);
    
    // Race: real data vs 1s timeout → skeleton wins if slow
    const loadUser = async () => Promise.race([
      // Real AsyncStorage load
      (async () => {
        try {
          const [raw, versionRaw] = await Promise.all([
            AsyncStorage.getItem(USER_KEY),
            AsyncStorage.getItem(USER_VERSION_KEY),
          ]);
          
          let userData = SKELETON_USER;
          if (raw) {
            const parsed = JSON.parse(raw);
            const version = versionRaw ? parseInt(versionRaw, 10) : 1;
            if (version < USER_VERSION) {
              // Simple v1→v2 migration
              userData = normalizeUser({
                ...parsed,
                plan: parsed.plan || "free",
                version: USER_VERSION,
              });
              await AsyncStorage.multiSet([
                [USER_KEY, JSON.stringify(userData)],
                [USER_VERSION_KEY, String(USER_VERSION)],
              ]);
            } else {
              userData = normalizeUser(parsed);
            }
          }
          dispatch(setUser(userData));
        } catch (err) {
          console.warn("[useUserData] Load fallback to skeleton:", err.message);
          dispatch(setUser(SKELETON_USER));
        }
      })(),
      // Skeleton timeout guarantee
      new Promise(resolve => setTimeout(() => {
        dispatch(setUser(SKELETON_USER));
        resolve();
      }, LOAD_TIMEOUT))
    ]);
    
    loadUser().finally(() => setLoading(false));
  }, [dispatch]);

  const updateUser = useCallback(async (updates) => {
    setWriteLoading(true);
    try {
      const current = reduxUser || SKELETON_USER;
      const merged = normalizeUser({
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      
      dispatch(setUser(merged));
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
      await AsyncStorage.setItem(USER_VERSION_KEY, String(USER_VERSION));
    } catch (err) {
      setWriteError(err.message);
      console.error("[useUserData] Update failed:", err);
    } finally {
      setWriteLoading(false);
    }
  }, [reduxUser, dispatch]);

  const completeOnboarding = useCallback(async (plan = "free") => {
    await updateUser({ onboarded: true, plan });
  }, [updateUser]);

  const resetUser = useCallback(async () => {
    dispatch(resetUserState());
    await AsyncStorage.multiRemove([USER_KEY, USER_VERSION_KEY]);
  }, [dispatch]);

  return {
    user: reduxUser || SKELETON_USER,
    loading,
    writeLoading,
    error,
    writeError,
    updateUser,
    completeOnboarding,
    resetUser,
    onboarded: reduxUser?.onboarded ?? false,
    plan: reduxUser?.plan ?? "free",
  };
};

export default useUserData;


  const updateUser = useCallback(
    async (updates, options = {}) => {
      const { optimistic = true, mergeStrategy = "shallow" } = options;
      const previousProfile = buildPersistedProfile(user);
      let merged;

      if (mergeStrategy === "deep") {
        merged = {
          ...previousProfile,
          ...updates,
          preferences: {
            ...previousProfile.preferences,
            ...(updates.preferences || {}),
          },
          updatedAt: new Date().toISOString(),
        };
      } else {
        merged = {
          ...previousProfile,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }

      const newUser = normalizeStoredProfile(merged);

      if (optimistic) {
        dispatch(setUser(newUser));
      }

      try {
        await retryAsync(async () => {
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
          await AsyncStorage.setItem(
            STORAGE_VERSION_KEY,
            String(CURRENT_STORAGE_VERSION),
          );
        });
        if (!optimistic) dispatch(setUser(newUser));
        setWriteError(null);
        retryCountRef.current = 0;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Update failed";
        setWriteError(message);
        console.error("[useUserData] update failed, rolling back", err);
        if (optimistic && previousProfile) {
          dispatch(setUser(previousProfile));
        }
        throw new Error(message);
      }
    },
    [user, dispatch],
  );

  const completeOnboarding = useCallback(
    async (plan = "free") => {
      await updateUser({ onboarded: true, plan });
    },
    [updateUser],
  );

  const resetUser = useCallback(async () => {
    const defaultUser = normalizeStoredProfile({
      onboarded: false,
      plan: "free",
      preferences: {},
      version: CURRENT_STORAGE_VERSION,
      createdAt: new Date().toISOString(),
    });
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultUser));
      await AsyncStorage.setItem(
        STORAGE_VERSION_KEY,
        String(CURRENT_STORAGE_VERSION),
      );
      dispatch(setUser(defaultUser));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset failed";
      setWriteError(message);
      throw new Error(message);
    }
  }, [dispatch]);

  const clearUser = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem(STORAGE_VERSION_KEY);
      dispatch(resetUserState());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Clear failed";
      setWriteError(message);
      throw new Error(message);
    }
  }, [dispatch]);

  const syncWithBackend = useCallback(async () => {
    setWriteLoading(true);
    try {
      console.log("[useUserData] sync with backend not implemented");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setWriteError(message);
      throw new Error(message);
    } finally {
      setWriteLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    writeLoading,
    error,
    writeError,
    updateUser,
    completeOnboarding,
    resetUser,
    clearUser,
    syncWithBackend,
    onboarded: user?.onboarded ?? false,
    plan: user?.plan ?? "free",
  };
};

export default useUserData;
