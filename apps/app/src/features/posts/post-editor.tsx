'use client';

import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorRoot, EditorContent, StarterKit } from 'novel';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/queries';
import { postsKeys } from '@/queries/keys';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { parseEditorContent } from './parse-editor-content';
import { toast } from 'sonner';

interface PostEditorProps {
  postId: string;
  initialContent: string | null;
}

export default function PostEditor({
  postId,
  initialContent,
}: PostEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  const mutation = useMutation({
    mutationFn: (content: string) =>
      api.posts.updateContent(supabase, postId, content),
    onSuccess: async () => {
      setStatus('Saved successfully');
      toast.success('Post saved');
      await queryClient.invalidateQueries({
        queryKey: postsKeys.detail(postId),
      });
      await queryClient.invalidateQueries({ queryKey: postsKeys.all() });
    },
    onError: (err: Error) => {
      setStatus(`Save failed: ${err.message}`);
      toast.error(`Failed to save: ${err.message}`);
    },
    onSettled: () => setSaving(false),
  });

  const handleSave = useCallback(() => {
    if (!editor) {
      setStatus('Editor is not ready yet');
      toast.error('Editor is not ready yet');
      return;
    }

    setSaving(true);
    setStatus('Saving...');
    mutation.mutate(JSON.stringify(editor.getJSON()));
  }, [editor, mutation]);

  return (
    <div className="space-y-4">
      <EditorRoot>
        <EditorContent
          initialContent={parseEditorContent(initialContent)}
          extensions={[StarterKit]}
          className="min-h-[300px] rounded-md border bg-background p-4"
          onCreate={({ editor: ed }) => setEditor(ed)}
          onDestroy={() => setEditor(null)}
        />
      </EditorRoot>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !editor}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        {status ? (
          <p className="text-sm text-muted-foreground" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
