import { join, dirname } from "path";
import { writeFileSync, existsSync } from "fs";
import { 
  getRepoRootAsync, 
  listWorktreesAsync, 
  createWorktreeAsync, 
  removeWorktreeAsync, 
  fetchLocalBranchesAsync, 
  fetchRemoteBranchesAsync 
} from "../services/git";
import { AppService } from "../services/AppService";
import { Branch, Config } from "../core/types";

const CD_PATH_FILE = '/tmp/tree-buddy-cd-path';

export async function handleList(args: string[]) {
  try {
    const service = new AppService({
      getDocumentsPath: () => join(process.env.HOME || '', 'Documents'),
    } as any);
    
    const state = service.getState();
    const projects = state.cfg.projects;

    if (projects.length === 0) {
      console.log('\x1b[38;2;88;110;117mNo projects found in Tree Buddy.\x1b[0m');
      return;
    }

    console.log('\n\x1b[38;2;42;161;152mTree Buddy\x1b[0m \x1b[38;2;88;110;117m| Projects\x1b[0m\n');

    for (const project of projects) {
      const sortedBranches = [...project.branches].sort((a, b) => {
        if (a.isMain) return -1;
        if (b.isMain) return 1;
        return a.path.localeCompare(b.path);
      });

      if (sortedBranches.length === 0) continue;

      console.log(`\x1b[38;2;42;161;152m> ${project.name}\x1b[0m \x1b[38;2;88;110;117m(${sortedBranches.length})\x1b[0m`);
      
      for (const br of sortedBranches) {
        const locked = br.locked ? ' \x1b[38;2;220;50;47m[locked]\x1b[0m' : '';
        const mainTag = br.isMain ? ' \x1b[38;2;211;54;130m[main]\x1b[0m' : '';
        const dot = br.isMain ? '\x1b[38;2;181;137;0m●\x1b[0m' : '\x1b[38;2;133;153;0m●\x1b[0m';
        
        let displayPath = br.path;
        if (br.path === project.root) {
          displayPath = '.';
        } else if (br.path.startsWith(project.root)) {
          displayPath = br.path.replace(project.root, '').replace(/^\//, '');
        } else {
          const home = process.env.HOME || '';
          displayPath = br.path.replace(home, '~');
        }

        console.log(`   ${dot} \x1b[38;2;131;148;150m${displayPath.padEnd(50)}\x1b[0m [\x1b[38;2;38;139;210m${br.name}\x1b[0m]${locked}${mainTag}`);
      }
      console.log('');
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function handleAdd(args: string[], switchOnly = false) {
  const branch = args[0];
  if (!branch) {
    console.error('Usage: tb add <branch>');
    process.exit(1);
  }

  try {
    const service = new AppService({
      getDocumentsPath: () => join(process.env.HOME || '', 'Documents'),
    } as any);

    let repoRoot: string = '';
    let worktrees: Branch[] = [];

    try {
      repoRoot = await getRepoRootAsync(process.cwd());
      worktrees = await listWorktreesAsync(repoRoot);
    } catch (e) {
      const state = service.getState();
      const projects = state.cfg.projects;
      for (const p of projects) {
        worktrees.push(...p.branches);
      }
      repoRoot = projects[0]?.root;
    }
    
    const byPath = worktrees.find(wt => 
      wt.path.endsWith(`/${branch}`) || 
      wt.path.endsWith(`/${branch}/`)
    );

    if (byPath) {
      writeFileSync(CD_PATH_FILE, byPath.path);
      process.exit(0);
    }

    const byBranch = worktrees.find(wt => 
      wt.name === branch || 
      wt.name === `l/${branch}` || 
      wt.name === `s/${branch}` ||
      wt.name === `feature/${branch}` ||
      wt.name.endsWith(`/${branch}`)
    );

    if (byBranch) {
      writeFileSync(CD_PATH_FILE, byBranch.path);
      process.exit(0);
    }

    if (switchOnly) {
       console.error(`Error: No worktree found for branch or path matching ${branch}`);
       process.exit(1);
    }

    if (!repoRoot) {
      console.error('Error: Not in a git repository and no known projects found to create worktree in.');
      process.exit(1);
    }
    
    if (process.cwd() !== repoRoot && !existsSync(join(process.cwd(), '.git'))) {
       try { process.chdir(repoRoot); } catch {}
    }

    const worktreeRoot = join(dirname(repoRoot), '.worktree');
    let targetPath = join(worktreeRoot, branch);
    
    if (branch.includes('/') && existsSync(join(worktreeRoot, branch))) {
      targetPath = join(worktreeRoot, branch);
    }

    if (existsSync(targetPath)) {
      const wtAtDir = worktrees.find(wt => wt.path === targetPath);
      if (wtAtDir) {
        console.error(`Error: Directory ${targetPath} is already used by worktree with branch ${wtAtDir.name}`);
        process.exit(1);
      }
      console.error(`Warning: Directory ${targetPath} already exists. Creating a unique path...`);
      targetPath = `${targetPath}-${Math.floor(Math.random() * 1000)}`;
    }

    const localBranches = await fetchLocalBranchesAsync(repoRoot);
    const remoteBranches = await fetchRemoteBranchesAsync(repoRoot);
    
    let actualBranch = branch;
    let exists = localBranches.includes(branch) || remoteBranches.includes(branch);
    
    if (!exists) {
      const possibleBranches = [`l/${branch}`, `s/${branch}`, `feature/${branch}`, `fix/${branch}`];
      for (const b of possibleBranches) {
        if (localBranches.includes(b) || remoteBranches.includes(b)) {
          actualBranch = b;
          exists = true;
          break;
        }
      }
    }

    console.error(`Creating worktree for ${actualBranch} at ${targetPath}...`);
    await createWorktreeAsync({
      repoRoot,
      path: targetPath,
      branch: actualBranch,
      createBranch: !exists,
    });
    
    writeFileSync(CD_PATH_FILE, targetPath);
    process.exit(0);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function handleRemove(args: string[]) {
  let branch = args[0];
  let force = args.includes('--force') || args.includes('-f');
  
  if (branch === '-f' || branch === '--force') {
    branch = args[1];
  }

  if (!branch) {
    console.error('Usage: tb rm [-f] <branch>');
    process.exit(1);
  }

  try {
    const repoRoot = await getRepoRootAsync(process.cwd());
    const worktrees = await listWorktreesAsync(repoRoot);
    const target = worktrees.find(wt => wt.name === branch);

    if (!target) {
      console.error(`No worktree found for branch ${branch}`);
      process.exit(1);
    }

    console.error(`Removing worktree ${target.path}...`);
    await removeWorktreeAsync(repoRoot, target.path, force);
    console.error('✓ Removed');
    process.exit(0);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
