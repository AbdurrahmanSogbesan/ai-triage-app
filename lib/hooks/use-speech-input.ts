"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type SpeechInputErrorCode =
  | "not-allowed"
  | "network"
  | "no-speech"
  | "aborted"
  | "unknown";

interface UseSpeechInputOptions {
  /** Called with the full composed string (base text + spoken text), not a delta. */
  onTranscript: (composedText: string) => void;
  /** Called on recognition errors so the consumer can decide what to surface. */
  onError?: (code: SpeechInputErrorCode) => void;
  /** BCP-47 locale. Defaults to Nigerian English, the best available for this app. */
  lang?: string;
}

interface UseSpeechInputResult {
  /** Whether this browser exposes SpeechRecognition. False during SSR and first paint. */
  supported: boolean;
  recording: boolean;
  /** Latest interim (not-yet-final) segment, exposed for optional UI. */
  interimText: string;
  /** Begin recognition, snapshotting `baseText` as the text spoken words append to. */
  start: (baseText: string) => void;
  /** Stop gracefully — the engine flushes the final result for the last utterance. */
  stop: () => void;
  /** Discard the session — abort and detach handlers so no trailing result lands. */
  cancel: () => void;
}

function getRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Browser support never changes at runtime, so the store never emits.
function subscribeToSupport(): () => void {
  return () => {};
}

function getSupportSnapshot(): boolean {
  return getRecognitionCtor() !== undefined;
}

function getSupportServerSnapshot(): boolean {
  return false;
}

function mapErrorCode(error: SpeechRecognitionErrorCode): SpeechInputErrorCode {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "network":
      return "network";
    case "no-speech":
      return "no-speech";
    case "aborted":
      return "aborted";
    default:
      return "unknown";
  }
}

/**
 * Wraps the browser's SpeechRecognition for the interview composer.
 *
 * Composition model: each `start(baseText)` snapshots the current textarea
 * contents, and every result event rebuilds the full spoken string from
 * scratch and appends it to that base. A fresh recognition instance is created
 * per start, which keeps `event.results` scoped to the current session so the
 * rebuild is correct, and lets a denied-permission retry work cleanly.
 *
 * Note: while recording is active, speech owns the field — text typed mid-
 * recording is overwritten by the next result. Editing happens after stop.
 */
export function useSpeechInput({
  onTranscript,
  onError,
  lang = "en-NG",
}: UseSpeechInputOptions): UseSpeechInputResult {
  // useSyncExternalStore renders the server snapshot (false) during hydration,
  // then swaps to the real client value — capability detection with no
  // hydration mismatch and no setState-in-effect.
  const supported = useSyncExternalStore(
    subscribeToSupport,
    getSupportSnapshot,
    getSupportServerSnapshot,
  );
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingRef = useRef(false);
  const baseTextRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  // Keep callback refs current so the recognition event handlers — attached
  // once at start() and outliving many re-renders — never call stale closures.
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  });

  // Detach handlers and release the mic. Used by cancel() and unmount cleanup.
  const teardown = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.abort();
      recognitionRef.current = null;
    }
    recordingRef.current = false;
  }, []);

  // Release the mic if the component unmounts mid-recording.
  useEffect(() => teardown, [teardown]);

  const start = useCallback(
    (baseText: string) => {
      if (recordingRef.current) return;
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;

      baseTextRef.current = baseText;
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i += 1) {
          const segment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += segment;
          } else {
            interim += segment;
          }
        }
        const spoken = (final + interim).trimStart();
        const base = baseTextRef.current;
        const joiner = base.length > 0 && !/\s$/.test(base) ? " " : "";
        setInterimText(interim);
        onTranscriptRef.current(base + joiner + spoken);
      };

      rec.onerror = (event) => {
        onErrorRef.current?.(mapErrorCode(event.error));
      };

      // onend is the single reconciliation point for "recording stopped" — it
      // fires after silence timeout, stop(), abort(), and every error.
      rec.onend = () => {
        recordingRef.current = false;
        recognitionRef.current = null;
        setRecording(false);
        setInterimText("");
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        // start() throws InvalidStateError if the engine is already running;
        // the recordingRef guard above makes this rare, but bail cleanly.
        recognitionRef.current = null;
        return;
      }
      recordingRef.current = true;
      setRecording(true);
    },
    [lang],
  );

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    // stop() (not abort) lets the engine deliver one final result for words
    // spoken just before the tap. Dismiss the banner optimistically; onend
    // will reconcile the rest.
    recordingRef.current = false;
    setRecording(false);
    rec.stop();
  }, []);

  const cancel = useCallback(() => {
    teardown();
    setRecording(false);
    setInterimText("");
  }, [teardown]);

  return { supported, recording, interimText, start, stop, cancel };
}
