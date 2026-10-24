# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Visitantes que evalúan el trabajo de Héctor Sanhueza (reclutadores, clientes potenciales) y, secundariamente, personas en Chile que quieren saber qué sismo ocurrió hace poco. Los primeros deben percibir nivel de oficio; los segundos deben poder consultar el dato sin fricción.

## Product Purpose
Mapa y lista de los sismos recientes en Chile, actualizados cada minuto con datos del USGS. Es una pieza de portafolio que a la vez funciona como herramienta real de consulta. Éxito: que impresione por su calidad y que siga siendo útil y fiable.

## Positioning
Visualización en español de Chile (ubicaciones traducidas como "72 km al SSO de Colchane", hora de Chile) sobre datos públicos en vivo, sin cuentas ni API keys.

## Operating Context
Datos del servicio FDSN del USGS para un rectángulo que cubre Chile, validados con Zod, cacheados 60 s; el navegador consulta `/api/sismos` cada minuto. El USGS registra principalmente sismos de magnitud 4 o superior en Chile. Mapa base de Esri (gris oscuro, sin key). Desplegado en Vercel: https://sismos-chile-rouge.vercel.app

## Capabilities and Constraints
- Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, TanStack Query, Leaflet, Zod.
- Conservar sí o sí: la fuente de datos USGS (sin API keys) y el aviso de que no es un sistema oficial de alerta (SENAPRED y SHOA para emergencias).
- Libertad para sumar librerías (p. ej. three.js, MapLibre, animación) si aportan a la experiencia, aun con mayor peso.
- No decidido: si se conservan tal cual los filtros, la lista, la firma HS y los textos; la redisposición queda abierta en el trabajo visual.

## Brand Commitments
Autor: Héctor Sanhueza (logo HS en `public/logo-hs.png`). Idioma: español de Chile.

## Evidence on Hand
Capturas de escritorio y móvil en `docs/`. Datos reales en vivo del USGS. No hay testimonios ni métricas de uso; no inventarlos.

## Product Principles
- Los datos son reales y se muestran con honestidad: nada de cifras ni alertas inventadas.
- Una pieza de portafolio debe ser memorable sin dejar de ser útil.
- El aviso de que no es un sistema oficial siempre es visible y claro.
- Rendimiento y accesibilidad cuentan como parte del oficio, también en celular.

## Accessibility & Inclusion
Sin requisito específico declarado; respetar `prefers-reduced-motion` y contraste suficiente es una práctica base.
