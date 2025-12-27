# SurveyPay - Survey Rewards Platform PRD

## Original Problem Statement
Build a full survey website with user registration/login, cool dashboard interface, survey integration (Inbrain, CPX Research), and backend that automates user balance immediately when a survey is completed.

## User Choices
- Mock integrations for Inbrain and CPX Research
- Points-based reward system with withdrawal capability
- Dashboard with basic stats, survey history, earnings, and leaderboard
- Both JWT auth and Google social login
- Dark and light theme toggle

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT + Emergent Google OAuth

### Database Collections
- `users` - User profiles with balance, total_earned, surveys_completed
- `user_sessions` - Google OAuth sessions
- `survey_completions` - Completed survey records
- `pending_surveys` - In-progress surveys
- `withdrawals` - Withdrawal requests

## What's Been Implemented (December 27, 2025)

### Core Features ✅
1. **Landing Page** - Hero section, features, stats, providers, CTA
2. **Authentication** - JWT (email/password) + Google OAuth
3. **Dashboard** - Stats cards, available surveys, recent earnings
4. **Surveys Page** - Filter by provider, start/complete surveys with progress simulation
5. **Survey History** - Table of completed surveys with earnings
6. **Leaderboard** - Top earners ranked by total_earned
7. **Wallet** - Balance, total earned, pending withdrawals, withdrawal requests
8. **Theme Toggle** - Dark/Light mode with persistence

### API Endpoints
- `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/session`
- `/api/surveys`, `/api/surveys/start`, `/api/surveys/complete`, `/api/surveys/history`
- `/api/stats`, `/api/wallet`, `/api/withdrawals`, `/api/leaderboard`

### Mocked Integrations
- **Inbrain** - 5 mock surveys
- **CPX Research** - 5 mock surveys

## P0/P1/P2 Features Remaining

### P0 (Critical)
- None - MVP complete

### P1 (High Priority)
- Real Inbrain API integration
- Real CPX Research API integration
- Email verification for registration
- Password reset flow

### P2 (Nice to Have)
- User profile page with settings
- Referral system
- Survey recommendation based on user profile
- Admin dashboard for withdrawal management
- Push notifications for new surveys

## Next Tasks
1. Integrate real Inbrain API when keys are available
2. Integrate real CPX Research API when keys are available
3. Add email verification flow
4. Implement withdrawal processing (admin side)
