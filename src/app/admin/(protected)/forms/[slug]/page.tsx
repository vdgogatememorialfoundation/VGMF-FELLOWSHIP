"use client";

import { use } from "react";
import { FormBuilderEditor } from "@/components/admin/FormBuilderEditor";

export default function FormEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <FormBuilderEditor slug={slug} />;
}
