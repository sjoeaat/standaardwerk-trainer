import { describe, test, expect } from '@jest/globals';
import { buildFolderTree } from '../../src/hierarchyBuilder.js';

describe('hierarchyBuilder', () => {
  describe('buildFolderTree', () => {
    test('should create root node with empty children and programs', () => {
      const programs = [];
      const result = buildFolderTree(programs);
      
      expect(result).toEqual({
        name: null,
        children: {},
        programs: [],
      });
    });
    
    test('should place programs without folderPath at root', () => {
      const programs = [
        { name: 'Program1', folderPath: [] },
        { name: 'Program2' }, // No folderPath property
      ];
      
      const result = buildFolderTree(programs);
      
      expect(result.programs).toHaveLength(2);
      expect(result.programs[0].name).toBe('Program1');
      expect(result.programs[1].name).toBe('Program2');
      expect(Object.keys(result.children)).toHaveLength(0);
    });
    
    test('should create single-level folder structure', () => {
      const programs = [
        { name: 'Program1', folderPath: ['Folder1'] },
        { name: 'Program2', folderPath: ['Folder2'] },
      ];
      
      const result = buildFolderTree(programs);
      
      expect(Object.keys(result.children)).toHaveLength(2);
      expect(result.children['Folder1']).toBeDefined();
      expect(result.children['Folder2']).toBeDefined();
      expect(result.children['Folder1'].programs).toHaveLength(1);
      expect(result.children['Folder1'].programs[0].name).toBe('Program1');
    });
    
    test('should create multi-level nested folder structure', () => {
      const programs = [
        { name: 'Program1', folderPath: ['Level1', 'Level2', 'Level3'] },
      ];
      
      const result = buildFolderTree(programs);
      
      expect(result.children['Level1']).toBeDefined();
      expect(result.children['Level1'].children['Level2']).toBeDefined();
      expect(result.children['Level1'].children['Level2'].children['Level3']).toBeDefined();
      expect(result.children['Level1'].children['Level2'].children['Level3'].programs).toHaveLength(1);
    });
    
    test('should handle multiple programs in same folder', () => {
      const programs = [
        { name: 'Program1', folderPath: ['Shared', 'Folder'] },
        { name: 'Program2', folderPath: ['Shared', 'Folder'] },
        { name: 'Program3', folderPath: ['Shared', 'Folder'] },
      ];
      
      const result = buildFolderTree(programs);
      
      const sharedFolder = result.children['Shared'].children['Folder'];
      expect(sharedFolder.programs).toHaveLength(3);
      expect(sharedFolder.programs.map(p => p.name)).toEqual(['Program1', 'Program2', 'Program3']);
    });
    
    test('should handle mixed folder depths', () => {
      const programs = [
        { name: 'RootProgram', folderPath: [] },
        { name: 'Level1Program', folderPath: ['Level1'] },
        { name: 'DeepProgram', folderPath: ['Level1', 'Level2', 'Level3'] },
        { name: 'AnotherLevel1', folderPath: ['AnotherFolder'] },
      ];
      
      const result = buildFolderTree(programs);
      
      expect(result.programs).toHaveLength(1); // RootProgram
      expect(result.children['Level1'].programs).toHaveLength(1); // Level1Program
      expect(result.children['Level1'].children['Level2'].children['Level3'].programs).toHaveLength(1); // DeepProgram
      expect(result.children['AnotherFolder'].programs).toHaveLength(1); // AnotherLevel1
    });
    
    test('should create proper node structure for each folder', () => {
      const programs = [
        { name: 'Program1', folderPath: ['Folder1', 'SubFolder'] },
      ];
      
      const result = buildFolderTree(programs);
      
      // Check root
      expect(result.name).toBe(null);
      expect(result.children).toBeDefined();
      expect(result.programs).toEqual([]);
      
      // Check Folder1
      const folder1 = result.children['Folder1'];
      expect(folder1.name).toBe('Folder1');
      expect(folder1.children).toBeDefined();
      expect(folder1.programs).toEqual([]);
      
      // Check SubFolder
      const subFolder = folder1.children['SubFolder'];
      expect(subFolder.name).toBe('SubFolder');
      expect(subFolder.children).toBeDefined();
      expect(subFolder.programs).toHaveLength(1);
    });
    
    test('should handle complex real-world hierarchy', () => {
      const programs = [
        { name: 'Main Control', folderPath: ['1. System', '1.1 Control'] },
        { name: 'Tank Monitor', folderPath: ['1. System', '1.2 Monitoring', '1.2.1 Tanks'] },
        { name: 'Pump Control', folderPath: ['1. System', '1.2 Monitoring', '1.2.2 Pumps'] },
        { name: 'Safety System', folderPath: ['2. Safety'] },
        { name: 'Emergency Stop', folderPath: ['2. Safety', '2.1 Emergency'] },
        { name: 'Global Config', folderPath: [] },
      ];
      
      const result = buildFolderTree(programs);
      
      // Root level
      expect(result.programs).toHaveLength(1); // Global Config
      expect(Object.keys(result.children)).toHaveLength(2); // 1. System, 2. Safety
      
      // System branch
      const system = result.children['1. System'];
      expect(Object.keys(system.children)).toHaveLength(2); // 1.1 Control, 1.2 Monitoring
      expect(system.children['1.1 Control'].programs).toHaveLength(1); // Main Control
      
      // Monitoring sub-branch
      const monitoring = system.children['1.2 Monitoring'];
      expect(Object.keys(monitoring.children)).toHaveLength(2); // 1.2.1 Tanks, 1.2.2 Pumps
      expect(monitoring.children['1.2.1 Tanks'].programs).toHaveLength(1); // Tank Monitor
      expect(monitoring.children['1.2.2 Pumps'].programs).toHaveLength(1); // Pump Control
      
      // Safety branch
      const safety = result.children['2. Safety'];
      expect(safety.programs).toHaveLength(1); // Safety System
      expect(safety.children['2.1 Emergency'].programs).toHaveLength(1); // Emergency Stop
    });
    
    test('should handle empty folderPath array same as no folderPath', () => {
      const programs = [
        { name: 'Program1', folderPath: [] },
        { name: 'Program2', folderPath: null },
        { name: 'Program3', folderPath: undefined },
        { name: 'Program4' },
      ];
      
      const result = buildFolderTree(programs);
      
      expect(result.programs).toHaveLength(4);
      expect(Object.keys(result.children)).toHaveLength(0);
    });
    
    test('should not mutate input programs', () => {
      const programs = [
        { name: 'Program1', folderPath: ['Folder1'] },
      ];
      const originalPrograms = JSON.parse(JSON.stringify(programs));
      
      buildFolderTree(programs);
      
      expect(programs).toEqual(originalPrograms);
    });
    
    test('should handle folder names with special characters', () => {
      const programs = [
        { name: 'Program1', folderPath: ['Folder-1', 'Sub_Folder.2', 'Level (3)'] },
      ];
      
      const result = buildFolderTree(programs);
      
      expect(result.children['Folder-1']).toBeDefined();
      expect(result.children['Folder-1'].children['Sub_Folder.2']).toBeDefined();
      expect(result.children['Folder-1'].children['Sub_Folder.2'].children['Level (3)']).toBeDefined();
    });
    
    test('should handle duplicate programs gracefully', () => {
      const programs = [
        { name: 'Program1', folderPath: ['Folder1'] },
        { name: 'Program1', folderPath: ['Folder1'] }, // Duplicate
      ];
      
      const result = buildFolderTree(programs);
      
      expect(result.children['Folder1'].programs).toHaveLength(2);
      expect(result.children['Folder1'].programs[0]).toBe(programs[0]);
      expect(result.children['Folder1'].programs[1]).toBe(programs[1]);
    });
  });
});