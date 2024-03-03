export type ReadmooBookAnnotation = {
  highlight: string
  note: string
  color: string

  chapter?: string
  highlighted?: string
}

export type ReadmooBook = {
  title: string;
  cover: string;
  annotationsCount: { highlightsCount: number, notesCount: number }
  annotations: Array<ReadmooBookAnnotation>

  annotated?: string;
}
