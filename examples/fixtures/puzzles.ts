import type {PuzzleDefinition} from '@banora/sdk/puzzle';
import {getRuleProfile} from '@banora/sdk/rules';
/** Original local exercises, authored for SDK behavior rather than engine grading. */
export const puzzles:readonly PuzzleDefinition[]=[{
  schemaVersion:'banora.puzzle/v1',id:'capture-extend',title:'Capture, then extend',
  prompt:'Black to play. Capture the white stone, then extend below after the authored reply.',
  sgf:'(;FF[4]GM[1]SZ[5]AB[ab][ba][cb]AW[bb]C[Banora original exercise])',
  tree:{id:'start',hints:[{text:'The white stone has one liberty.'},{text:'Fill the point below it.',point:{x:1,y:2}}],children:[
    {id:'capture',move:{x:1,y:2},feedback:'Captured. White plays away.',response:'white',children:[
      {id:'white',move:{x:4,y:4},hints:[{text:'Extend your capturing stone downwards.',point:{x:1,y:3}}],children:[
        {id:'extend',move:{x:1,y:3},result:'correct',feedback:'Correct: capture and extension complete.'},
        {id:'miss-extension',move:{x:2,y:2},result:'incorrect',feedback:'This authored branch does not extend below the capturing stone.'}]}]},
    {id:'miss-capture',move:{x:3,y:3},result:'incorrect',feedback:'That misses White’s remaining liberty.'}]}
},{
  schemaVersion:'banora.puzzle/v1',id:'pass-response',title:'An authored pass response',
  prompt:'Black to play. Pass and observe the explicitly authored White pass. This is a workflow exercise.',
  sgf:'(;SZ[5]AB[bb][bc]AW[dd][de])',rules:getRuleProfile('aga-area').play,
  tree:{id:'start',hints:[{text:'Use the Pass button.'}],children:[{id:'black-pass',move:null,response:'white-pass',children:[
    {id:'white-pass',move:null,result:'correct',feedback:'Both authored passes are complete.'}]}]}
}];
