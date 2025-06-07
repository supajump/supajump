'use client';

import { useState } from 'react';
import { EditorRoot, EditorContent, useEditor, StarterKit } from 'novel';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface PostEditorProps {
  postId: string;
  initialContent: string | null;
}

export default function PostEditor({ postId, initialContent }: PostEditorProps) {
  const { editor } = useEditor();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);
    const content = JSON.stringify(editor.getJSON());
    await supabase.from('posts').update({ content }).eq('id', postId);
    setSaving(false);
  };

  return (
    <div className='space-y-4'>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent ? JSON.parse(initialContent) : undefined}
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
