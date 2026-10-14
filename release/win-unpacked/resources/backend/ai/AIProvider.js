export class AIProvider {
  async chat(prompt, history = []) {
    throw new Error("AIProvider method 'chat' must be implemented");
  }

  async search(query, files = []) {
    throw new Error("AIProvider method 'search' must be implemented");
  }

  async recommend(metrics) {
    throw new Error("AIProvider method 'recommend' must be implemented");
  }
}
