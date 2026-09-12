/**
 * 2D Spatial Navigation Manager for Smart TV Remote (D-Pad)
 */

type NavigationListener = (newFocusedId: string, previousId: string | null) => void;

class SpatialNavigationManager {
  private currentFocusedId: string | null = null;
  private listeners: Set<NavigationListener> = new Set();
  private focusMemory: Map<string, string> = new Map(); // Remember last focus in each screen/section
  private audioContext: AudioContext | null = null;

  constructor() {
    // Lazy audio context for focus tick sound
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', () => {
        if (!this.audioContext && (window.AudioContext || (window as any).webkitAudioContext)) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          this.audioContext = new AudioCtx();
        }
      }, { once: true });
    }
  }

  public subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getCurrentFocus(): string | null {
    return this.currentFocusedId;
  }

  public setFocus(id: string, playSound = true): void {
    if (this.currentFocusedId === id) return;
    const previous = this.currentFocusedId;
    this.currentFocusedId = id;

    // Remove focus class from old element
    if (previous) {
      const oldEl = document.querySelector(`[data-nav-id="${previous}"]`) as HTMLElement | null;
      if (oldEl) {
        oldEl.classList.remove('tv-focused', 'tv-focused-subtle');
        if (oldEl.tagName === 'INPUT' || oldEl.tagName === 'TEXTAREA') {
          oldEl.blur();
        }
      }
    }

    // Add focus class and center in view
    const newEl = document.querySelector(`[data-nav-id="${id}"]`) as HTMLElement;
    if (newEl) {
      newEl.classList.add('tv-focused');
      newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      
      // Save in group memory if element has group
      const group = newEl.getAttribute('data-nav-group');
      if (group) {
        this.focusMemory.set(group, id);
      }
    }

    if (playSound) {
      this.playFocusSound();
    }

    this.listeners.forEach(fn => fn(id, previous));
  }

  public restoreGroupFocus(group: string, fallbackId: string): void {
    const rememberedId = this.focusMemory.get(group);
    if (rememberedId && document.querySelector(`[data-nav-id="${rememberedId}"]`)) {
      this.setFocus(rememberedId);
    } else {
      this.setFocus(fallbackId);
    }
  }

  /**
   * Navigate using Euclidean Nearest Neighbor
   */
  public navigate(direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): boolean {
    if (!this.currentFocusedId) {
      const first = document.querySelector('[data-nav-id]') as HTMLElement;
      if (first) {
        this.setFocus(first.getAttribute('data-nav-id')!);
        return true;
      }
      return false;
    }

    const currentEl = document.querySelector(`[data-nav-id="${this.currentFocusedId}"]`) as HTMLElement;
    if (!currentEl) {
      const first = document.querySelector('[data-nav-id]') as HTMLElement;
      if (first) this.setFocus(first.getAttribute('data-nav-id')!);
      return false;
    }

    // Check explicit override attributes: data-nav-up, data-nav-down, data-nav-left, data-nav-right
    const explicitTarget = currentEl.getAttribute(`data-nav-${direction.toLowerCase()}`);
    if (explicitTarget) {
      const targetEl = document.querySelector(`[data-nav-id="${explicitTarget}"]`);
      if (targetEl) {
        this.setFocus(explicitTarget);
        return true;
      }
    }

    // Otherwise calculate 2D spatial distance among all visible focusable elements
    const candidates = Array.from(document.querySelectorAll('[data-nav-id]:not([disabled]):not([aria-hidden="true"])')) as HTMLElement[];
    const currentRect = currentEl.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const el of candidates) {
      if (el === currentEl) continue;
      const rect = el.getBoundingClientRect();
      // Skip offscreen or invisible elements
      if (rect.width === 0 || rect.height === 0) continue;

      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isEligible = false;
      let primaryDiff = 0;
      let secondaryDiff = 0;

      switch (direction) {
        case 'UP':
          if (dy < -8) { // Above current element
            isEligible = true;
            primaryDiff = Math.abs(dy);
            secondaryDiff = Math.abs(dx);
          }
          break;
        case 'DOWN':
          if (dy > 8) { // Below current element
            isEligible = true;
            primaryDiff = Math.abs(dy);
            secondaryDiff = Math.abs(dx);
          }
          break;
        case 'LEFT':
          if (dx < -8) { // To the left
            isEligible = true;
            primaryDiff = Math.abs(dx);
            secondaryDiff = Math.abs(dy);
          }
          break;
        case 'RIGHT':
          if (dx > 8) { // To the right
            isEligible = true;
            primaryDiff = Math.abs(dx);
            secondaryDiff = Math.abs(dy);
          }
          break;
      }

      if (isEligible) {
        // Weighted distance giving preference to alignment on primary axis
        const distance = primaryDiff + secondaryDiff * 1.8;
        if (distance < minDistance) {
          minDistance = distance;
          bestCandidate = el;
        }
      }
    }

    if (bestCandidate) {
      const newId = bestCandidate.getAttribute('data-nav-id');
      if (newId) {
        this.setFocus(newId);
        return true;
      }
    }

    return false;
  }

  public triggerClick(): void {
    if (!this.currentFocusedId) return;
    const currentEl = document.querySelector(`[data-nav-id="${this.currentFocusedId}"]`) as HTMLElement;
    if (currentEl) {
      if (currentEl.tagName === 'INPUT' || currentEl.tagName === 'TEXTAREA') {
        currentEl.focus();
      }
      currentEl.click();
      this.playSelectSound();
    }
  }

  private playFocusSound(): void {
    try {
      if (!this.audioContext) return;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.audioContext.currentTime); // Soft A4 tick
      gain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.05);
    } catch {
      // Audio context might not be allowed before user interaction
    }
  }

  private playSelectSound(): void {
    try {
      if (!this.audioContext) return;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, this.audioContext.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.08);
    } catch {}
  }
}

export const spatialNav = new SpatialNavigationManager();
