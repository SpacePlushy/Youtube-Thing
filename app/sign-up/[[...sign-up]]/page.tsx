'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const redirectUrl = searchParams.get('redirect_url') || '/';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Account</h1>
          {message === 'free_limit_reached' ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground">
                You&apos;ve used your free transcript extraction! Sign up to continue using YouTube Thing with unlimited access.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Sign up to extract unlimited YouTube transcripts
            </p>
          )}
        </div>
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-background border border-border shadow-lg",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-background border border-border hover:bg-muted text-foreground",
              formFieldLabel: "text-foreground",
              formFieldInput: "bg-background border-border text-foreground",
              footerActionLink: "text-primary hover:text-primary/80"
            }
          }}
          redirectUrl={redirectUrl}
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}