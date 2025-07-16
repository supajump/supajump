'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import {
  FormProvider,
  useFormContext,
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { cn } from '@/lib/utils'

const Form = FormProvider

interface FormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends Omit<ControllerProps<TFieldValues, TName>, 'render'> {
  render: ControllerProps<TFieldValues, TName>['render']
}

function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  ...props
}: FormFieldProps<TFieldValues, TName>) {
  return <Controller {...props} />
}

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  )
)
FormItem.displayName = 'FormItem'

const FormLabel = React.forwardRef<React.ElementRef<'label'>, React.ComponentPropsWithoutRef<'label'>>(
  ({ className, ...props }, ref) => {
    return <label ref={ref} className={cn(className)} {...props} />
  }
)
FormLabel.displayName = 'FormLabel'

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ className, ...props }, ref) => {
    return <Slot ref={ref} className={cn(className)} {...props} />
  }
)
FormControl.displayName = 'FormControl'

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { formState } = useFormContext()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (props.id && (formState.errors as any)[props.id]?.message) as string | undefined
    return (
      <p ref={ref} className={cn('text-sm font-medium text-destructive', className)} {...props}>
        {children ?? message}
      </p>
    )
  }
)
FormMessage.displayName = 'FormMessage'

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage }
