// Los colores de cada finca se guardan en la base de datos (p. ej. "bg-purple-100 border-purple-500"),
// así que se incluyen siempre aunque no aparezcan escritos en el código.
const colores = 'purple|red|orange|green|slate|blue|pink|yellow|gray|emerald|amber|sky';
module.exports = {
  content: [],
  safelist: [{ pattern: new RegExp(`^(bg|border|text)-(${colores})-(50|100|200|300|400|500|600|700|800|900)$`) }],
};
