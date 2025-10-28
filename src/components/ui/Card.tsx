import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        // Use shared glassmorphism utility with soft rounding and transitions
        "indus-card rounded-2xl transition glass-fade-in " +
        className
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"px-5 py-4 border-b border-white/10 light:border-slate-200/60 flex items-center justify-between " + className}>{children}</div>;
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"p-4 " + className}>{children}</div>;
}


