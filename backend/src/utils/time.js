// Utilidades de zona horaria para Colombia (America/Bogota, UTC-5)
const TIMEZONE = 'America/Bogota';

/**
 * Retorna la fecha y hora actual en Colombia como objeto con getters numéricos.
 */
function getColombiaNow() {
  const now = new Date();
  const colombiaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = colombiaFormatter.formatToParts(now);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const hours = parseInt(partMap.hour, 10);
  const minutes = parseInt(partMap.minute, 10);

  return {
    dateStr, // YYYY-MM-DD
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

/**
 * Convierte un string "HH:MM" a minutos transcurridos desde medianoche.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Comprueba si una fecha y hora dadas pertenecen al pasado en Colombia.
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:MM
 */
function isPastInColombia(dateStr, timeStr) {
  const now = getColombiaNow();
  if (dateStr < now.dateStr) return true;
  if (dateStr > now.dateStr) return false;
  return timeToMinutes(timeStr) <= now.totalMinutes;
}

/**
 * Obtiene el día de la semana (0=domingo, 6=sábado) para una fecha YYYY-MM-DD
 * interpretada en hora local de Colombia sin desfases de UTC.
 */
function getColombiaWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Usamos el constructor en UTC y le sumamos 5 horas para que coincida con Colombia
  const dObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dObj.getUTCDay();
}

module.exports = {
  TIMEZONE,
  getColombiaNow,
  timeToMinutes,
  isPastInColombia,
  getColombiaWeekday,
};

