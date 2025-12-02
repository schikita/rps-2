export type Move = "rock" | "paper" | "scissors";

export function getBotMove(): Move {
  const moves: Move[] = ["rock", "paper", "scissors"];
  const index = Math.floor(Math.random() * moves.length);
  return moves[index];
}

export function detectWinner(player: Move, bot: Move): "win" | "lose" | "draw" {
  if (player === bot) return "draw";

  if (
    (player === "rock" && bot === "scissors") ||
    (player === "scissors" && bot === "paper") ||
    (player === "paper" && bot === "rock")
  ) {
    return "win";
  }

  return "lose";
}
