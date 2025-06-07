'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlusIcon } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPost } from '@/queries/posts'

interface CreatePostModalProps {
  orgId: string
  teamId: string
}

export function CreatePostModal({ orgId, teamId }: CreatePostModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('post')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  const generateSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const mutation = useMutation({
    mutationFn: () =>
      createPost({
        title,
        content,
        post_type: postType,
        slug: generateSlug(title),
        org_id: orgId,
        team_id: teamId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['posts', orgId, teamId] })
      await fetch('/api/revalidate-tag', {
        method: 'POST',
        body: JSON.stringify({ tag: 'posts' }),
      })
      setTitle('')
      setContent('')
      setPostType('post')
      setOpen(false)
      router.refresh()
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className='mr-2 h-4 w-4' />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[525px]'>
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Create a new post for your team. You can edit it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='title'>Title</Label>
              <Input
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Enter post title'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='content'>Content</Label>
              <Textarea
                id='content'
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder='Write your post content here...'
                className='min-h-[100px]'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='post-type'>Post Type</Label>
              <select
                id='post-type'
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                className='flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
              >
                <option value='post'>Post</option>
                <option value='article'>Article</option>
                <option value='announcement'>Announcement</option>
              </select>
            </div>
            {error && <p className='text-sm text-red-500'>{error}</p>}
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Post'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
