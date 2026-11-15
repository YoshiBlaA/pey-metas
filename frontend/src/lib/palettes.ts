// Paletas de acento para la landing (de Colorbears): cada una va de oscuro (c900) a muy claro (c50).
// El verde de la marca sigue siendo el color de los botones y estados; estas paletas solo decoran.
export interface Palette {
  name: string
  c900: string
  c700: string
  c500: string
  c200: string
  c50: string
  /** Sombra "apilada" bajo cada banda (un tono más oscuro que c900). */
  edge: string
}

export const THERMAL_GLAZE: Palette = { name: 'Thermal Glaze', c900: '#DD1715', c700: '#E33D37', c500: '#EC7267', c200: '#F7B6A5', c50: '#FDD7C2', edge: '#C00000' }
export const STATIC_AMETHYST: Palette = { name: 'Static Amethyst', c900: '#1715A3', c700: '#3D36B4', c500: '#7266CC', c200: '#B6A3EB', c50: '#D7C0F9', edge: '#0A0866' }
export const ARCTIC_SKY: Palette = { name: 'Arctic Sky', c900: '#27A7F6', c700: '#4FB7F8', c500: '#87CEFA', c200: '#CFEBFD', c50: '#F1F9FE', edge: '#0A6BEA' }
export const SAGE_STATIC: Palette = { name: 'Sage Static', c900: '#174A17', c700: '#3C6B3D', c500: '#719A72', c200: '#B5D7B6', c50: '#D5F3D7', edge: '#0B2A0B' }
export const IONIZED_CYAN: Palette = { name: 'Ionized Cyan', c900: '#1EC2E4', c700: '#48CDE9', c500: '#82DDF0', c200: '#CDF1F9', c50: '#F0FBFD', edge: '#0590C8' }

/** Orden en que se reparten los acentos (pasos, metas destacadas…). */
export const ACCENTS: Palette[] = [IONIZED_CYAN, STATIC_AMETHYST, THERMAL_GLAZE, ARCTIC_SKY, SAGE_STATIC]
export const accent = (i: number) => ACCENTS[((i % ACCENTS.length) + ACCENTS.length) % ACCENTS.length]
