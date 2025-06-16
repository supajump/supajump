type headingLevel = 1 | 2 | 3 | 4 | 5 | 6

interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
  headingLevel?: headingLevel
}

interface headingLevelProps {
  children: React.ReactNode
  headingLevel: headingLevel
}

const HeadingTag = ({ children, headingLevel = 1 }: headingLevelProps) => {
  switch (headingLevel) {
    case 1:
      return <h1 className="font-heading text-xl md:text-2xl">{children}</h1>
    case 2:
      return <h2 className="font-heading text-lg md:text-xl">{children}</h2>
    case 3:
      return <h3 className="font-heading text-base md:text-lg">{children}</h3>
    case 4:
      return <h4 className="font-heading text-base md:text-lg">{children}</h4>
    case 5:
      return <h5 className="font-heading text-base md:text-lg">{children}</h5>
    case 6:
      return <h6 className="font-heading text-sm md:text-base">{children}</h6>
  }
}

export function DashboardHeader({
  heading,
  text,
  children,
  headingLevel = 1,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="grid gap-1">
        <HeadingTag headingLevel={headingLevel}>{heading}</HeadingTag>
        {text && <p className="text-md text-muted-foreground">{text}</p>}
      </div>
      {children}
    </div>
  )
}