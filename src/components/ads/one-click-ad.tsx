'use client';

import { useEffect } from 'react';

/**
 * Componente que gestiona el anuncio "One Click" (Popunder) de Monetag.
 * Implementa una lógica de "una vez por día calendario".
 */
export default function OneClickAd() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ONCLICK_STORAGE_KEY = 'last_onclick_day';
    const today = new Date().toDateString(); // Retorna algo como "Fri Oct 27 2023"
    const lastShownDay = localStorage.getItem(ONCLICK_STORAGE_KEY);

    // Si el día guardado es diferente al día de hoy, mostramos el anuncio
    if (lastShownDay !== today) {
      const script = document.createElement('script');
      // Código proporcionado por Monetag para One Click (Zone 10691148)
      script.text = `
        (function(s){
          s.dataset.zone='10691148';
          s.src='https://al5sm.com/tag.min.js';
        })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
      `;
      
      document.body.appendChild(script);
      
      // Guardamos el día actual para que no se vuelva a mostrar hoy
      localStorage.setItem(ONCLICK_STORAGE_KEY, today);
    }
  }, []);

  return null;
}
