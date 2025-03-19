# BetterMe.AI

BetterMe.AI is a personal development platform that helps users optimize their physical appearance and wellness through AI-powered insights and a supportive community. The platform uses advanced image analysis via the Gemini API to provide personalized recommendations for improvement.

## Features

- **AI-Powered Assessment**: Personalized recommendations based on user-submitted photos to enhance physical appearance and wellness
= **Improvement Tracking**: Monitor progress over time with data-driven insights
- **User Authentication**: Secure login and registration system
- **Content Moderation**: Automated and manual content filtering to maintain a positive environment
- **Real-time Updates**: Instant notifications and content updates

## Tech Stack

- **Frontend**: React, TypeScript
- **Backend**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Mobile**: Native support for Android and iOS using Capacitor
- **Deployment**: Netlify with continuous integration

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
   ```
   git clone https://github.com/rudrasingh500/bettermeai.git
   cd bettermeai
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and add your Supabase credentials

4. Start the development server
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src` - Main application code
- `/android` - Android-specific code
- `/ios` - iOS-specific code
- `/supabase` - Supabase configuration and functions

## Key Components

### Authentication System

The authentication system uses Supabase Auth with email/password and social login options. User sessions are securely managed with JWT tokens.

### Community Features

The platform includes:
- User profiles
- Content sharing
- Commenting and reactions
- Ranking system based on contribution and engagement

### Content Moderation

Content moderation is implemented using:
- Automated AI-powered filtering for inappropriate content

## Deployment

The application is deployed on Netlify at [https://stellular-dolphin-8d87c5.netlify.app/](https://stellular-dolphin-8d87c5.netlify.app/)

## Future Development

- Enhanced analytics dashboard
- Personalized wellness recommendations
- Integration with fitness tracking devices
- Community challenges and events
- Expanded mobile features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
