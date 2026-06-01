# Teach Me, Ciel-Sensei!

A fully interactive, AI-powered learning companion featuring Ciel and Neco-Arc from TYPE-MOON's *Tsukihime -A piece of blue glass moon-*. Study any topic through engaging visual novel-style conversations powered by Google's Gemini AI.

## Features

- **AI Tutor**: Powered by Google's Gemini with automatic model rotation for reliability
- **Study Modes**:
  - General Lesson & Study Guide
  - Flashcard Active Recall
  - Reverse Tutor (Teach the AI)
  - Socratic Inquiry Drill
- **Visual Novel Interface**: Dialog box, character sprites, and chalkboard for immersive learning
- **File Upload**: Supports images and PDFs for AI analysis
- **Dual Characters**: Switch between Ciel-Sensei (structured, polite) and Neco-Arc (chaotic, unhinged)
- **Mobile Optimized**: Responsive layout with pinch-zoom, scroll support, and desktop simulation toggle
- **Math Rendering**: KaTeX integration for beautiful mathematical expressions

## Quick Start

1. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Enter your API key in the "Enter API Key..." field and click **Take Attendance**
3. Select a study mode, choose your instructor, and start learning!

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript (ES Modules)
- Google Generative AI (Gemini) via CDN
- KaTeX for math rendering
- PDF.js for PDF text extraction
- Cloudflare Tunnel / ngrok for mobile testing

## Mobile Testing

Use Cloudflare Tunnel to test on your phone:

```bash
# Start local server
python -m http.server 5500

# In another terminal
cloudflared tunnel --url http://localhost:5500
```

Then open the generated URL on your mobile device.

## Study Mode Guide

| Mode | Description |
|------|-------------|
| **General Lesson** | Comprehensive topic overview with board notes |
| **Flashcard** | Active recall with 3D flip cards |
| **Reverse Tutor** | You teach Ciel — she asks clarifying questions |
| **Socratic** | Guided inquiry through layered questions |

## Character Personalities

### Ciel-Sensei
The seventh seat of the Holy Church's Burial Agency, undercover as your senpai. Gentle, systematic, and endlessly patient — though she'll tease you affectionately when you struggle. Obsessed with curry and uses cooking analogies for every concept. Switches to cold "Executor mode" when errors occur.

### Neco-Arc
A chaotic cat gremlin who makes zero sense but is somehow accidentally insightful. Says "nya" a lot. Do not trust her with math.

## Credits

- **Ciel and Neco-Arc characters** are from *Tsukihime -A piece of blue glass moon-* by **TYPE-MOON**. All character assets, names, and likenesses are property of TYPE-MOON.
- Powered by **Google Gemini** via the Generative AI API.
- Math rendering by **KaTeX**.
- PDF parsing by **PDF.js** (Mozilla).

This is a fan-made educational project with no commercial affiliation to TYPE-MOON or Google.

## License

This project is provided as-is for educational purposes. Character assets belong to their respective copyright holders.

---

NOTE:
This project was just used to prototype AI API integration. Youre better off going to other sites like these if  youre really that serious about studying.., If it helps your grades get better somehow then im glad that this site helped lol
