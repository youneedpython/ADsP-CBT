declare module 'katex' {
  const katex: { renderToString: (text: string, options: { throwOnError: boolean; strict: 'ignore'; trust: boolean; displayMode?: boolean }) => string };
  export default katex;
}
