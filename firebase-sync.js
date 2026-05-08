// Firebase Sync Module
// Handles syncing data between localStorage and Firestore

let userId = localStorage.getItem("user_id");
if (!userId) {
  userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("user_id", userId);
}

let isSyncing = false;
let syncListenersSetup = false;

// Upload data to Firestore
async function syncToFirebase() {
  if (isSyncing || !db) return;
  isSyncing = true;

  try {
    const userRef = db.collection("users").doc(userId);

    await userRef.set(
      {
        cols: cols || [],
        cards: cards || [],
        tags: TAG_DEFS || [],
        nextId: nextId || 100,
        lastUpdated: new Date(),
      },
      { merge: true },
    );

    console.log("✓ Data synced to Firebase");
  } catch (error) {
    console.error("Error syncing to Firebase:", error);
  } finally {
    isSyncing = false;
  }
}

// Load data from Firestore
async function loadFromFirebase() {
  if (!db) return;

  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (doc.exists) {
      const data = doc.data();

      // Load data into variables
      if (data.cols) cols = data.cols;
      if (data.cards) cards = data.cards;
      if (data.tags) TAG_DEFS = data.tags;
      if (data.nextId) nextId = data.nextId;

      // Save to localStorage too
      localStorage.setItem("kb_cols", JSON.stringify(cols));
      localStorage.setItem("kb_cards", JSON.stringify(cards));
      localStorage.setItem("kb_tags", JSON.stringify(TAG_DEFS));
      localStorage.setItem("kb_nid", String(nextId));

      console.log("✓ Data loaded from Firebase");
      return true;
    } else {
      console.log("No data found on Firebase, using local data");
      return false;
    }
  } catch (error) {
    console.error("Error loading from Firebase:", error);
    return false;
  }
}

// Set up real-time listeners for cross-device sync
function setupRealTimeSync() {
  if (syncListenersSetup || !db) return;
  syncListenersSetup = true;

  const userRef = db.collection("users").doc(userId);

  userRef.onSnapshot(
    (doc) => {
      if (!doc.exists) return;

      const data = doc.data();

      // Check if remote data is newer
      if (data.cols && JSON.stringify(data.cols) !== JSON.stringify(cols)) {
        cols = data.cols;
        localStorage.setItem("kb_cols", JSON.stringify(cols));
      }

      if (data.cards && JSON.stringify(data.cards) !== JSON.stringify(cards)) {
        cards = data.cards;
        localStorage.setItem("kb_cards", JSON.stringify(cards));
      }

      if (data.tags && JSON.stringify(data.tags) !== JSON.stringify(TAG_DEFS)) {
        TAG_DEFS = data.tags;
        localStorage.setItem("kb_tags", JSON.stringify(TAG_DEFS));
      }

      if (data.nextId && data.nextId !== nextId) {
        nextId = data.nextId;
        localStorage.setItem("kb_nid", String(nextId));
      }

      // Re-render if data changed
      render();
      console.log("✓ Real-time sync received update");
    },
    (error) => {
      console.error("Error setting up real-time listener:", error);
    },
  );
}

// Initialize Firebase sync on page load
async function initFirebaseSync() {
  console.log("Initializing Firebase sync...");

  // Wait for Firebase to be ready
  if (typeof firebase === "undefined") {
    console.warn("Firebase not loaded yet, retrying...");
    setTimeout(initFirebaseSync, 500);
    return;
  }

  try {
    // Load data from Firebase
    const hasRemoteData = await loadFromFirebase();

    // Set up real-time listeners
    setupRealTimeSync();

    console.log("Firebase sync ready");
  } catch (error) {
    console.error("Error initializing Firebase sync:", error);
  }
}

// Call this on page load
window.addEventListener("load", initFirebaseSync);
