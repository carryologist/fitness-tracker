import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Optional: Restrict to specific email for single-user app
      const allowedEmail = process.env.ALLOWED_EMAIL
      
      if (allowedEmail && user.email !== allowedEmail) {
        console.warn(`Unauthorized login attempt by ${user.email}`)
        return false // Deny access
      }
      
      return true // Allow access
    },
    async session({ session, token }) {
      // Add user ID to session if needed
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user, account }) {
      // Persist user data to token
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/login', // Custom sign-in page
  },
  session: {
    strategy: "jwt", // Use JWT for sessions (serverless-friendly)
  },
})
