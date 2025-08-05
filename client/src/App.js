import React, { useEffect, useState } from 'react';
import socket from './socket';

function App() {
  const [players, setPlayers] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [chooserId, setChooserId] = useState('');
  const [isNextChooser, setIsNextChooser] = useState(false);
  const [maskedMovie, setMaskedMovie] = useState('');
  const [strikes, setStrikes] = useState([]);
  const [clue, setClue] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [movieToChoose, setMovieToChoose] = useState('');
  const [scoreboard, setScoreboard] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    socket.on('roomUpdate', setPlayers);

    socket.on('movieSelected', ({ chooserId, maskedMovie, strikes, clue }) => {
      setChooserId(chooserId);
      setMaskedMovie(maskedMovie);
      setStrikes(strikes);
      setClue(clue);
      setGameStarted(true);
      setTimeLeft(30);
    });

    socket.on('letterRevealed', ({ maskedMovie }) => {
      setMaskedMovie(maskedMovie);
    });

    socket.on('strikeUpdate', ({ strikes }) => {
      setStrikes(strikes);
    });

    socket.on('clueReveal', ({ clue }) => {
      setClue(clue);
    });

    socket.on('letterRevealed', ({ maskedMovie, scoreboard }) => {
      setMaskedMovie(maskedMovie);
      setScoreboard(scoreboard);
    });

    socket.on('gameResult', ({ result, winnerId, correctMovie, scoreboard }) => {
      alert(result === 'win'
        ? `🎉 Player ${players.find(p => p.id === winnerId)?.name || 'Someone'} guessed it! Movie: ${correctMovie}`
        : `😢 Game Over! The movie was: ${correctMovie}`);

      setScoreboard(scoreboard);
      setGameStarted(false);
      setMaskedMovie('');
      setStrikes([]);
      setClue(null);
      setGuessInput('');
    });

    socket.on('nextChooser', ({ chooserId }) => {
      setChooserId(chooserId);
      setIsNextChooser(chooserId === socket.id);
      setGameStarted(false);  // Reset to selection screen
    });

    socket.on('sessionOver', ({ message }) => {
      alert(message);
      window.location.reload();
    });

    let timer;
    if (gameStarted && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }

    return () => clearTimeout(timer); {
      socket.off('roomUpdate');
      socket.off('movieSelected');
      socket.off('letterRevealed');
      socket.off('strikeUpdate');
      socket.off('clueReveal');
      socket.off('gameResult');
      socket.off('nextChooser');
      socket.off('sessionOver');
    };
  }, [players, timeLeft, gameStarted]);

  const handleJoin = () => {
    if (roomId && playerName) {
      socket.emit('joinRoom', { roomId, playerName });
      setJoined(true);
    }
  };

  const handleSelectMovie = () => {
    if (movieToChoose.trim()) {
      socket.emit('selectMovie', { roomId, movie: movieToChoose });
    }
  };

  const handleGuess = () => {
    if (guessInput.trim()) {
      socket.emit('submitGuess', { roomId, guess: guessInput, playerId: socket.id });
      setGuessInput('');
      setTimeLeft(30);  // Reset timer after guess
    }
  };

  const isChooser = chooserId === socket.id;

  return (
  <div style={{ textAlign: 'center', marginTop: '40px' }}>

    {/* ✅ Scoreboard Always Visible */}
    <h2>Scoreboard</h2>
        <ul>
          {players.map(player => (
            <li key={player.id}>
              {player.name}: {scoreboard[player.id] || 0} pts
            </li>
          ))}
        </ul>

    {!joined ? (
      <>
        <h1>Join Room</h1>
        <input placeholder="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} />
        <input placeholder="Your Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
        <button onClick={handleJoin}>Join</button>
      </>
    ) : !gameStarted ? (
  <>
    <h1>Players in Room {roomId}</h1>
    <ul>{players.map(p => <li key={p.id}>{p.name}</li>)}</ul>
    {isNextChooser ? (
      <>
        <h2>Your Turn! Choose a Movie</h2>
        <input
          placeholder="Type Movie Name"
          value={movieToChoose}
          onChange={e => setMovieToChoose(e.target.value)}
        />
        <button onClick={handleSelectMovie}>Select Movie</button>
      </>
    ) : (
      <p>Waiting for next chooser to select a movie...</p>
    )}
  </>
) : (
      <>
        <h2>Time Left: {timeLeft} sec</h2>
        <h1>{maskedMovie}</h1>
        <h2>Strikes: {strikes.join(' ') || '-'}</h2>
        {clue && <h3>Clue: {clue}</h3>}
        {!isChooser ? (
          <>
            <input
              placeholder="Guess Letter or Movie"
              value={guessInput}
              onChange={e => setGuessInput(e.target.value)}
            />
            <button onClick={handleGuess}>Submit Guess</button>
          </>
        ) : (
          <p>You selected the movie. Waiting for others to guess...</p>
        )}
      </>
    )}
  </div>
);
}

export default App;
