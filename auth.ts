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
    async signIn({ user }) {
      const allowedEmail = process.env.ALLOWED_EMAIL
      if (!allowedEmail) {
        console.error('ALLOWED_EMAIL env var is not set — denying all logins')
        return false
      }
      if (user.email !== allowedEmail) {
        console.warn(`Unauthorized login attempt: ${user.email?.substring(0, 3)}***`)
        return false
      }
      return true
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
