import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  icon: LucideIcon;
  className?: string;
}

export const StatsCard = ({ title, value, change, icon: Icon, className }: StatsCardProps) => {
  return (
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1">
            <span
              className={cn(
                "font-medium",
                change.type === 'positive' && "text-success",
                change.type === 'negative' && "text-destructive",
                change.type === 'neutral' && "text-muted-foreground"
              )}
            >
              {change.type === 'positive' && '+'}
              {change.value}%
            </span>{' '}
            {change.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
};