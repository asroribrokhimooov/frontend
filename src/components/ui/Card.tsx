import { cn } from '../../utils/cn';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
}

export function Card({
  className,
  padding = 'md',
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-2xl shadow-sm border border-gray-100',
        paddingClasses[padding],
        hover && 'transition-shadow hover:shadow-md',
        className
      )}
      {...props}
    />
  );
}
