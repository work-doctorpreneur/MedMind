"use client"

import { use } from "react"
import NotebookWorkspaceContent from "./NotebookWorkspaceContent"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function NotebookPage({ params }: PageProps) {
  const resolvedParams = use(params)
  return <NotebookWorkspaceContent notebookId={resolvedParams.id} />
}
