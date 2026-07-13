function sm2(quality, repetitions, easinessFactor, interval) {
  const q = Math.max(1, Math.min(5, Math.round(quality)));

  const newEF = Math.max(
    1.3,
    easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  let newRepetitions;
  let newInterval;

  if (q < 3) {
    newRepetitions = 0;
    newInterval = 0;
  } else {
    newRepetitions = repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }
  }

  const now = new Date();
  const nextReviewAt = newInterval === 0
    ? new Date(now.getTime() + 10 * 60 * 1000)
    : new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    easinessFactor: Math.round(newEF * 100) / 100,
    repetitions: newRepetitions,
    interval: newInterval,
    nextReviewAt,
  };
}

module.exports = { sm2 };
