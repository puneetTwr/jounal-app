/** Everything one GitHub API call needs to identify and authenticate against a content repository. */
export interface GithubApiContext {
    owner: string;
    repo: string;
    branch: string;
    token: string;
}
