import type { AudioFeatures, PlaylistMoodSummary } from "../types/spotify.js";

export function computeMoodSummary(features: AudioFeatures[]): PlaylistMoodSummary {
  const n = features.length;
  if (n === 0) {
    return { avgTempo: 0, avgEnergy: 0, avgDanceability: 0, avgValence: 0, avgAcousticness: 0, avgSpeechiness: 0, avgLoudness: 0, trackCount: 0 };
  }

  const sum = features.reduce(
    (acc, f) => ({
      tempo: acc.tempo + f.tempo,
      energy: acc.energy + f.energy,
      danceability: acc.danceability + f.danceability,
      valence: acc.valence + f.valence,
      acousticness: acc.acousticness + f.acousticness,
      speechiness: acc.speechiness + f.speechiness,
      loudness: acc.loudness + f.loudness,
    }),
    { tempo: 0, energy: 0, danceability: 0, valence: 0, acousticness: 0, speechiness: 0, loudness: 0 }
  );

  return {
    avgTempo: sum.tempo / n,
    avgEnergy: sum.energy / n,
    avgDanceability: sum.danceability / n,
    avgValence: sum.valence / n,
    avgAcousticness: sum.acousticness / n,
    avgSpeechiness: sum.speechiness / n,
    avgLoudness: sum.loudness / n,
    trackCount: n,
  };
}
