export function isMainSourceCode(
  argv: string[],
  sourceCodeFileName: string
): boolean {
  return (
    argv[0].endsWith("ts-node") &&
    argv[1] === `${process.cwd()}/${sourceCodeFileName}`
  );
}
