'use client';

import { useState } from 'react';
import { EditorRoot, EditorContent, useEditor, StarterKit } from 'novel';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/queries';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

interface PostEditorProps {
  postId: string;
  initialContent: string | null;
}

export default function PostEditor({
  postId,
  initialContent,
}: PostEditorProps) {
  const { editor } = useEditor();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  const mutation = useMutation({
    mutationFn: (content: string) =>
      api.posts.updateContent(supabase, postId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['post', postId] });
      await fetch('/api/revalidate-tag', {
        method: 'POST',
        body: JSON.stringify({ tag: 'posts' }),
      });
    },
    onSettled: () => setSaving(false),
  });

  const handleSave = () => {
    if (!editor) return;
    setSaving(true);
    const content = JSON.stringify(editor.getJSON());
    mutation.mutate(content);
  };

  return (
    <div className='space-y-4'>
      <EditorRoot>
        <EditorContent
          initialContent={
            initialContent ? JSON.parse(initialContent) : undefined
          }
          extensions={[StarterKit]}
          className='min-h-[300px] border rounded-md p-4 bg-background'
        />
      </EditorRoot>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
