import React, { useState, useEffect, useCallback } from 'react';
import { QuizQuestion } from '../../../services/geminiService';
import { useChaserAI, ChaserDifficulty } from '../../../hooks/useChaserAI';
import GameBoard from './GameBoard';
import ChaserThinking from './ChaserThinking';
import GameOutcome from './GameOutcome';

type TurnPhase = 'contestant-answer' | 'contestant-feedback' | 'chaser-answer' | 'chaser-feedback';
type GameResult = 'caught' | 'home-safe' | null;

interface HeadToHeadRoundProps {
  questions: QuizQuestion[];
  startingPosition: number;  // Contestant's starting position (1-5)
  chaserDifficulty: ChaserDifficulty;
  onComplete: (result: 'caught' | 'home-safe') => void;
  onExit: () => void;
}

const HeadToHeadRound: React.FC<HeadToHeadRoundProps> = ({
  questions,
  startingPosition,
  chaserDifficulty,
  onComplete,
  onExit
}) => {
  // Game state
  const [contestantPosition, setContestantPosition] = useState(startingPosition);
  const [chaserPosition, setChaserPosition] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('contestant-answer');
  const [gameResult, setGameResult] = useState<GameResult>(null);

  // Answer tracking
  const [contestantAnswer, setContestantAnswer] = useState<number | null>(null);
  const [chaserAnswer, setChaserAnswer] = useState<number | null>(null);

  // AI hook
  const { getChaserAnswer, isThinking } = useChaserAI({ difficulty: chaserDifficulty });

  const currentQuestion = questions[currentQuestionIndex];

  // Handle contestant answer selection
  const handleContestantAnswer = useCallback((selectedIndex: number) => {
    if (turnPhase !== 'contestant-answer') return;

    setContestantAnswer(selectedIndex);
    setTurnPhase('contestant-feedback');

    // Show feedback, then move to chaser's turn
    setTimeout(() => {
      // If correct, move contestant down
      if (selectedIndex === currentQuestion.correctAnswerIndex) {
        setContestantPosition(prev => Math.min(prev + 1, 6));
      }
      setTurnPhase('chaser-answer');
    }, 1500);
  }, [turnPhase, currentQuestion]);

  // Handle chaser's turn
  useEffect(() => {
    if (turnPhase !== 'chaser-answer') return;

    const executeChaserTurn = async () => {
      // AI thinks and answers
      const aiAnswer = await getChaserAnswer(currentQuestion);
      setChaserAnswer(aiAnswer);
      setTurnPhase('chaser-feedback');

      // Show feedback, then check game state
      setTimeout(() => {
        // If correct, move chaser down
        if (aiAnswer === currentQuestion.correctAnswerIndex) {
          setChaserPosition(prev => prev + 1);
        }

        // After positions update, check for game end
        setTimeout(() => {
          checkGameEnd();
        }, 600); // Wait for CSS animation to complete
      }, 1500);
    };

    executeChaserTurn();
  }, [turnPhase, currentQuestion, getChaserAnswer]);

  // Check for game end conditions
  const checkGameEnd = useCallback(() => {
    // Check positions after state updates
    setContestantPosition(currentContestantPos => {
      setChaserPosition(currentChaserPos => {
        // Caught: Chaser reached contestant's position
        if (currentChaserPos >= currentContestantPos) {
          setGameResult('caught');
          setTimeout(() => onComplete('caught'), 2000);
          return currentChaserPos;
        }

        // Home Safe: Contestant reached position 6
        if (currentContestantPos >= 6) {
          setGameResult('home-safe');
          setTimeout(() => onComplete('home-safe'), 2000);
          return currentChaserPos;
        }

        // Game continues - move to next question
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setContestantAnswer(null);
          setChaserAnswer(null);
          setTurnPhase('contestant-answer');
        } else {
          // Ran out of questions - contestant wins by default
          setGameResult('home-safe');
          setTimeout(() => onComplete('home-safe'), 2000);
        }

        return currentChaserPos;
      });
      return currentContestantPos;
    });
  }, [currentQuestionIndex, questions.length, onComplete]);

  // Show game outcome overlay
  if (gameResult) {
    return (
      <GameOutcome
        result={gameResult}
        onClose={onExit}
      />
    );
  }

  // Determine whose turn it is for display
  const activeTurn: 'contestant' | 'chaser' | 'none' =
    turnPhase === 'contestant-answer' || turnPhase === 'contestant-feedback'
      ? 'contestant'
      : turnPhase === 'chaser-answer' || turnPhase === 'chaser-feedback'
        ? 'chaser'
        : 'none';

  const showContestantFeedback = turnPhase === 'contestant-feedback';
  const showChaserFeedback = turnPhase === 'chaser-feedback';

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col p-6">
      {/* Chaser thinking overlay */}
      <ChaserThinking isVisible={isThinking} />

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest">
          Head-to-Head
        </h2>
        <p className="text-slate-400 mt-1">
          {activeTurn === 'contestant' && 'Your Turn'}
          {activeTurn === 'chaser' && 'The Chaser\'s Turn'}
          {activeTurn === 'none' && 'Game in progress'}
        </p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex gap-8 items-center justify-center">
        {/* Game Board */}
        <div className="flex-shrink-0">
          <GameBoard
            contestantPosition={contestantPosition}
            chaserPosition={chaserPosition}
            highlightHome={contestantPosition === 6}
          />
        </div>

        {/* Question and Answers */}
        <div className="flex-1 max-w-2xl">
          {/* Turn Indicator */}
          <div className="mb-4 flex items-center gap-3">
            <div className={`h-4 w-4 rounded-full ${
              activeTurn === 'contestant' ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'
            }`} />
            <span className={`font-bold ${
              activeTurn === 'contestant' ? 'text-blue-400' : 'text-slate-500'
            }`}>
              Contestant
            </span>
            <span className="text-slate-600 mx-2">|</span>
            <div className={`h-4 w-4 rounded-full ${
              activeTurn === 'chaser' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
            }`} />
            <span className={`font-bold ${
              activeTurn === 'chaser' ? 'text-red-400' : 'text-slate-500'
            }`}>
              Chaser
            </span>
          </div>

          {/* Question Card */}
          <div className="bg-slate-800/60 p-6 rounded-2xl border-2 border-slate-600 mb-6">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <p className="text-2xl font-bold text-white leading-relaxed">
              {currentQuestion?.question}
            </p>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-4">
            {currentQuestion?.options.map((option, idx) => {
              const isCorrect = idx === currentQuestion.correctAnswerIndex;
              const isContestantChoice = idx === contestantAnswer;
              const isChaserChoice = idx === chaserAnswer;

              // Determine button styling based on turn phase
              let buttonStyle = 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500';

              if (showContestantFeedback) {
                if (isContestantChoice && isCorrect) {
                  buttonStyle = 'bg-green-600 border-green-400 text-white';
                } else if (isContestantChoice && !isCorrect) {
                  buttonStyle = 'bg-red-600 border-red-400 text-white';
                } else if (isCorrect) {
                  buttonStyle = 'bg-green-600/50 border-green-400/50 text-white';
                } else {
                  buttonStyle = 'bg-slate-700 border-slate-600 text-slate-400';
                }
              } else if (showChaserFeedback) {
                if (isChaserChoice && isCorrect) {
                  buttonStyle = 'bg-green-600 border-green-400 text-white';
                } else if (isChaserChoice && !isCorrect) {
                  buttonStyle = 'bg-red-600 border-red-400 text-white';
                } else if (isCorrect) {
                  buttonStyle = 'bg-green-600/50 border-green-400/50 text-white';
                } else {
                  buttonStyle = 'bg-slate-700 border-slate-600 text-slate-400';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleContestantAnswer(idx)}
                  disabled={turnPhase !== 'contestant-answer'}
                  className={`
                    p-6 rounded-xl text-left font-bold text-lg
                    transition-all duration-200 border-2
                    ${buttonStyle}
                    ${turnPhase === 'contestant-answer' ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <span className="text-slate-400 mr-3">{idx + 1}.</span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exit button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onExit}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          End Game
        </button>
      </div>
    </div>
  );
};

export default HeadToHeadRound;
