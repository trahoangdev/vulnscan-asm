import * as React from 'react';
import { cn } from '@/lib/utils';

function Tabs({
  className,
  defaultValue,
  value,
  onValueChange,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue || '');

  React.useEffect(() => {
    if (value !== undefined) setActiveTab(value);
  }, [value]);

  const handleChange = (v: string) => {
    setActiveTab(v);
    onValueChange?.(v);
  };

  return (
    <div className={cn('', className)} data-active-tab={activeTab} {...props}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<any>, {
          activeTab,
          onTabChange: handleChange,
        });
      })}
    </div>
  );
}

function TabsList({
  className,
  children,
  activeTab,
  onTabChange,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  activeTab?: string;
  onTabChange?: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<any>, {
          activeTab,
          onTabChange,
        });
      })}
    </div>
  );
}

function TabsTrigger({
  className,
  value,
  children,
  activeTab,
  onTabChange,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}) {
  const isActive = activeTab === value;
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive && 'bg-background text-foreground shadow-sm',
        className,
      )}
      onClick={() => onTabChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({
  className,
  value,
  children,
  activeTab,
  onTabChange: _,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}) {
  if (activeTab !== value) return null;
  return (
    <div
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
