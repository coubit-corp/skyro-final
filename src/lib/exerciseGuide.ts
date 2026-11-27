// Guia de cada exercício da lista: equipamento, músculos secundários, vídeo de
// como fazer e o passo a passo. É conteúdo de orientação geral: não substitui
// a avaliação de um profissional, e a tela diz isso.

import type { Muscle } from './workouts'

export type Equipment = 'barra' | 'halteres' | 'maquina' | 'cabo' | 'peso_corporal'

export const EQUIPMENTS: { value: Equipment; label: string }[] = [
  { value: 'barra', label: 'Barra' },
  { value: 'halteres', label: 'Halteres' },
  { value: 'maquina', label: 'Máquina' },
  { value: 'cabo', label: 'Cabo / polia' },
  { value: 'peso_corporal', label: 'Peso do corpo' },
]

export function equipmentLabel(e: Equipment | undefined): string {
  return EQUIPMENTS.find((x) => x.value === e)?.label ?? 'Outro'
}

export interface ExerciseGuide {
  equipment: Equipment
  /** Músculos que também trabalham, além do principal. */
  secondary: Muscle[]
  /** Vídeo do YouTube que mostra a execução (só o id). */
  youtubeId: string
  steps: string[]
}

const g = (equipment: Equipment, secondary: Muscle[], youtubeId: string, steps: string[]): ExerciseGuide => ({
  equipment,
  secondary,
  youtubeId,
  steps,
})

/** Chave: o nome exato do exercício em EXERCISE_CATALOG. */
export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  // ---------------------------------------------------------------- peito
  'Supino reto (barra)': g('barra', ['triceps', 'ombros'], 'vIGvt-vgrvY', [
    'Deite no banco com os olhos logo abaixo da barra e os pés firmes no chão.',
    'Segure a barra um pouco mais aberto que a largura dos ombros e leve as escápulas para trás e para baixo.',
    'Tire a barra do suporte e desça controlando até encostar de leve no meio do peito, cotovelos a uns 45° do tronco.',
    'Empurre a barra de volta para cima soltando o ar, sem tirar o quadril do banco.',
  ]),
  'Supino reto (halteres)': g('halteres', ['triceps', 'ombros'], '31j_Io3ncRg', [
    'Sente com os halteres apoiados nas coxas e deite levando-os junto ao peito.',
    'Comece com os braços estendidos acima do peito, palmas para a frente e escápulas encaixadas.',
    'Desça os halteres abrindo os cotovelos em diagonal até sentir o peito alongar.',
    'Empurre de volta para cima, aproximando os halteres no alto sem bater um no outro.',
  ]),
  'Supino reto (máquina)': g('maquina', ['triceps', 'ombros'], 'FNCUgDqFekc', [
    'Ajuste o banco para que as pegadas fiquem na altura do meio do peito.',
    'Apoie bem as costas, mantenha os pés no chão e segure as pegadas.',
    'Empurre para a frente até quase estender os cotovelos, soltando o ar.',
    'Volte devagar até sentir o peito alongar, sem deixar o peso bater.',
  ]),
  'Supino inclinado (barra)': g('barra', ['ombros', 'triceps'], 'oZjIQN0YMX0', [
    'Regule o banco entre 30° e 45° e deite com os pés firmes no chão.',
    'Segure a barra um pouco mais aberto que os ombros, escápulas para trás e para baixo.',
    'Desça a barra com controle até a parte alta do peito, logo abaixo da clavícula.',
    'Empurre para cima soltando o ar, sem perder o apoio das costas no banco.',
  ]),
  'Supino inclinado (halteres)': g('halteres', ['ombros', 'triceps'], 'G-i3jMIbDmo', [
    'Regule o banco em cerca de 30° e deite com um halter em cada mão, junto ao peito.',
    'Estenda os braços acima da parte alta do peito, com as escápulas encaixadas.',
    'Desça os halteres com os cotovelos em diagonal, até a altura do peito.',
    'Empurre de volta para cima soltando o ar, mantendo a lombar apoiada.',
  ]),
  'Supino inclinado (máquina)': g('maquina', ['ombros', 'triceps'], 'bZtXNt7gbPY', [
    'Selecione a carga e ajuste o assento para que as pegadas fiquem na altura da parte alta do peito.',
    'Apoie as costas, leve os ombros para trás e segure as pegadas.',
    'Empurre para a frente e para cima soltando o ar, sem travar os cotovelos.',
    'Volte devagar até sentir o peito alongar.',
  ]),
  'Supino declinado (barra)': g('barra', ['triceps', 'ombros'], '9XqGE8PNrws', [
    'Prenda as pernas no apoio do banco declinado e deite com cuidado.',
    'Segure a barra um pouco mais aberto que os ombros, sem elevar os ombros.',
    'Desça a barra com controle até a parte baixa do peito.',
    'Empurre de volta para cima soltando o ar. Use alguém para ajudar a tirar e guardar a barra.',
  ]),
  'Crucifixo (máquina)': g('maquina', ['ombros'], 'zEcIgGm7fxU', [
    'Selecione a carga e ajuste o assento: as pegadas devem ficar na altura do peito.',
    'Sente, leve os ombros para trás e abra os braços para segurar as pegadas.',
    'Contraia o abdômen e traga os braços para a frente, fechando à frente do peito enquanto solta o ar.',
    'Abra os braços devagar até sentir o peito alongar, e inspire.',
  ]),
  'Crucifixo (halteres)': g('halteres', ['ombros'], 'L_tzzkGTMVM', [
    'Deite no banco reto com os halteres acima do peito, palmas viradas uma para a outra.',
    'Deixe os cotovelos levemente dobrados e mantenha esse ângulo o tempo todo.',
    'Abra os braços em arco até os halteres chegarem perto da altura do peito.',
    'Feche os braços pelo mesmo arco, como num abraço, contraindo o peito.',
  ]),
  'Crossover (cabo)': g('cabo', ['ombros'], 'pdMWt71MPlw', [
    'Ajuste as polias no alto, segure uma pegada em cada mão e dê um passo à frente.',
    'Incline levemente o tronco, com um pé à frente do outro e cotovelos levemente dobrados.',
    'Traga as mãos para a frente e para baixo até se encontrarem na frente do corpo.',
    'Volte devagar, deixando os braços abrirem até sentir o peito alongar.',
  ]),
  'Flexão de braço': g('peso_corporal', ['triceps', 'ombros', 'abdomen'], 'TbVWMhyax2U', [
    'Apoie as mãos no chão um pouco mais abertas que os ombros e estenda as pernas.',
    'Deixe o corpo em linha reta da cabeça aos pés, com o abdômen e os glúteos contraídos.',
    'Desça o peito em direção ao chão, com os cotovelos em diagonal.',
    'Empurre o chão e volte à posição inicial. Para facilitar, apoie os joelhos.',
  ]),

  // ---------------------------------------------------------------- costas
  'Puxada alta (cabo)': g('cabo', ['biceps', 'ombros'], 'mPmfwbc_svw', [
    'Ajuste o apoio das coxas e segure a barra mais aberto que os ombros, palmas para a frente.',
    'Sente com o peito alto e o tronco levemente inclinado para trás.',
    'Puxe a barra até a parte alta do peito levando os cotovelos para baixo e para trás.',
    'Volte devagar até estender os braços, sem soltar o peso de uma vez.',
  ]),
  'Puxada alta com pegada fechada (cabo)': g('cabo', ['biceps'], 'uAnrJBnxrZ0', [
    'Encaixe o triângulo na polia alta e ajuste o apoio das coxas.',
    'Segure o triângulo com as palmas viradas uma para a outra, peito alto.',
    'Puxe até perto do peito levando os cotovelos para baixo, junto ao corpo.',
    'Volte devagar até alongar as costas, sem tirar o quadril do banco.',
  ]),
  'Barra fixa': g('peso_corporal', ['biceps', 'abdomen'], 'BBmjDutLmAo', [
    'Segure a barra um pouco mais aberto que os ombros, palmas para a frente, e fique pendurado.',
    'Encaixe os ombros (para baixo e para trás) e contraia o abdômen.',
    'Puxe o corpo até o queixo passar da barra, levando os cotovelos para baixo.',
    'Desça com controle até estender os braços. Se ainda não sai, use o graviton ou um elástico.',
  ]),
  'Remada sentada (cabo)': g('cabo', ['biceps', 'ombros'], 'DbzBn7oyMSo', [
    'Sente com os pés na plataforma, joelhos levemente dobrados, e segure o triângulo.',
    'Mantenha a coluna reta e o peito aberto, sem arredondar as costas.',
    'Puxe o triângulo até a barriga, levando os cotovelos para trás e juntando as escápulas.',
    'Volte estendendo os braços devagar, sem jogar o tronco para a frente.',
  ]),
  'Remada sentada com pegada aberta (cabo)': g('cabo', ['ombros', 'biceps'], 'IVUC76X7iOI', [
    'Use uma barra longa e segure mais aberto que os ombros, palmas para baixo.',
    'Sente com a coluna reta, peito aberto e joelhos levemente dobrados.',
    'Puxe a barra até a parte de baixo do peito, abrindo os cotovelos para os lados.',
    'Volte devagar até estender os braços, mantendo a postura.',
  ]),
  'Remada curvada (barra)': g('barra', ['biceps', 'posteriores'], 'VJHBEy2duVc', [
    'Segure a barra na largura dos ombros e incline o tronco à frente com os joelhos levemente dobrados.',
    'Mantenha a coluna reta e o abdômen firme, com a barra perto das pernas.',
    'Puxe a barra até a barriga levando os cotovelos para trás.',
    'Desça a barra com controle, sem mudar a inclinação do tronco.',
  ]),
  'Remada unilateral (halter)': g('halteres', ['biceps', 'ombros'], '69JIUT2q6lU', [
    'Apoie o joelho e a mão do mesmo lado no banco, com a coluna reta.',
    'Segure o halter com a outra mão, braço estendido em direção ao chão.',
    'Puxe o halter até a lateral da cintura, levando o cotovelo para trás e para cima.',
    'Desça devagar até alongar as costas. Faça todas as repetições e troque de lado.',
  ]),
  'Remada (máquina)': g('maquina', ['biceps', 'ombros'], 'xpkNxVSN2ec', [
    'Ajuste o assento para que as pegadas fiquem na altura do peito e apoie o peito na almofada.',
    'Segure as pegadas com os braços estendidos.',
    'Puxe levando os cotovelos para trás e juntando as escápulas, sem tirar o peito do apoio.',
    'Volte devagar até estender os braços.',
  ]),
  'Pulldown com braços estendidos (cabo)': g('cabo', ['triceps', 'abdomen'], 'V-Z_RntYhZg', [
    'Fique de frente para a polia alta segurando a barra ou corda com os braços estendidos.',
    'Incline um pouco o tronco à frente, com os joelhos levemente dobrados.',
    'Com os cotovelos quase retos, puxe a barra em arco até perto das coxas.',
    'Volte devagar até os braços ficarem na altura da cabeça.',
  ]),
  Superman: g('peso_corporal', ['gluteos', 'posteriores'], '17ElZ1pYuJE', [
    'Deite de bruços no chão com os braços estendidos à frente.',
    'Contraia glúteos e abdômen e olhe para o chão, sem forçar o pescoço.',
    'Eleve ao mesmo tempo braços, peito e pernas alguns centímetros.',
    'Segure 2 segundos no alto e desça devagar.',
  ]),
  'Levantamento terra': g('barra', ['posteriores', 'gluteos', 'quadriceps'], 'QiqUXcz2iyA', [
    'Fique com os pés na largura do quadril e a barra sobre o meio dos pés.',
    'Dobre quadril e joelhos para segurar a barra, coluna reta, peito aberto e ombros sobre a barra.',
    'Empurre o chão com os pés e suba estendendo quadril e joelhos juntos, barra rente às pernas.',
    'Desça levando o quadril para trás primeiro, mantendo a coluna reta. Comece com pouca carga.',
  ]),

  // ---------------------------------------------------------------- ombros
  'Desenvolvimento de ombros (halteres)': g('halteres', ['triceps'], 'eufDL9MmF8A', [
    'Sente num banco com encosto e leve os halteres à altura dos ombros, palmas para a frente.',
    'Apoie as costas e contraia o abdômen.',
    'Empurre os halteres para cima até quase estender os cotovelos, soltando o ar.',
    'Desça com controle até a altura das orelhas.',
  ]),
  'Desenvolvimento de ombros (máquina)': g('maquina', ['triceps'], 'K--U1YsMHP8', [
    'Ajuste o assento para que as pegadas fiquem na altura dos ombros.',
    'Apoie bem as costas e segure as pegadas.',
    'Empurre para cima soltando o ar, sem travar os cotovelos no alto.',
    'Desça devagar até a altura dos ombros.',
  ]),
  'Desenvolvimento de ombros (barra)': g('barra', ['triceps', 'abdomen'], 'ZD3-TjUdiUo', [
    'Em pé, segure a barra na altura da clavícula com as mãos um pouco mais abertas que os ombros.',
    'Contraia abdômen e glúteos para não arquear a lombar.',
    'Empurre a barra para cima, passando perto do rosto, até estender os braços.',
    'Desça com controle até a clavícula.',
  ]),
  'Elevação lateral (halteres)': g('halteres', [], 'jannLx4RxKo', [
    'Em pé, segure um halter em cada mão ao lado do corpo, cotovelos levemente dobrados.',
    'Incline um pouco o tronco à frente e mantenha o abdômen firme.',
    'Eleve os braços para os lados até a altura dos ombros, sem balançar o corpo.',
    'Desça devagar. Prefira carga leve e movimento controlado.',
  ]),
  'Elevação lateral (máquina)': g('maquina', [], 'jTtN4KpiRLE', [
    'Ajuste o assento para que o eixo da máquina fique alinhado com os ombros.',
    'Apoie a parte de fora dos braços nas almofadas.',
    'Eleve os braços para os lados até a altura dos ombros.',
    'Desça com controle, sem deixar o peso bater.',
  ]),
  'Elevação lateral (cabo)': g('cabo', [], 'ze9B6VX4nUs', [
    'Fique de lado para a polia baixa e segure a pegada com a mão mais distante.',
    'Deixe o cotovelo levemente dobrado e o tronco firme.',
    'Eleve o braço para o lado até a altura do ombro.',
    'Volte devagar. Faça todas as repetições e troque de lado.',
  ]),
  'Elevação frontal (halteres)': g('halteres', ['peito'], 'jhxLYSm_P-k', [
    'Em pé, segure os halteres à frente das coxas.',
    'Mantenha o abdômen firme e os cotovelos levemente dobrados.',
    'Eleve os braços à frente até a altura dos ombros, sem balançar o tronco.',
    'Desça devagar até a posição inicial.',
  ]),
  'Crucifixo inverso (máquina)': g('maquina', ['costas'], 'SNN6BftNts8', [
    'Sente de frente para o encosto da máquina, com o peito apoiado.',
    'Segure as pegadas na altura dos ombros, braços estendidos à frente.',
    'Abra os braços para trás em arco, juntando as escápulas.',
    'Volte devagar até os braços ficarem à frente do corpo.',
  ]),
  'Flexão pike': g('peso_corporal', ['triceps'], 'nA8lcZRFDqs', [
    'Comece na posição de flexão e leve o quadril para cima, formando um "V" invertido.',
    'Deixe as mãos um pouco mais abertas que os ombros e a cabeça entre os braços.',
    'Dobre os cotovelos levando o topo da cabeça em direção ao chão.',
    'Empurre o chão e volte. Para facilitar, aproxime os pés das mãos menos.',
  ]),
  'Encolhimento de ombros (halteres)': g('halteres', ['costas'], 'AdkMdSoRVPE', [
    'Em pé, segure um halter em cada mão ao lado do corpo.',
    'Mantenha os braços estendidos e a coluna reta.',
    'Eleve os ombros em direção às orelhas, sem dobrar os cotovelos.',
    'Segure um segundo no alto e desça devagar.',
  ]),

  // ---------------------------------------------------------------- bíceps
  'Rosca direta (barra)': g('barra', [], 'Et1wgGMGW8w', [
    'Em pé, segure a barra na largura dos ombros com as palmas para a frente.',
    'Deixe os cotovelos junto ao corpo e o abdômen firme.',
    'Dobre os cotovelos levando a barra até perto dos ombros, sem balançar o tronco.',
    'Desça devagar até estender os braços.',
  ]),
  'Rosca direta (halteres)': g('halteres', [], '6O_hVOEArG4', [
    'Em pé, segure um halter em cada mão, palmas para a frente.',
    'Mantenha os cotovelos colados ao corpo.',
    'Suba os dois halteres juntos até perto dos ombros.',
    'Desça com controle até estender os braços.',
  ]),
  'Rosca alternada (halteres)': g('halteres', [], 'S1HAcTVQVYE', [
    'Em pé, segure os halteres ao lado do corpo, palmas viradas para as coxas.',
    'Suba um braço de cada vez, girando a palma para cima durante a subida.',
    'Mantenha o cotovelo parado junto ao corpo.',
    'Desça devagar e repita com o outro braço.',
  ]),
  'Rosca martelo (halteres)': g('halteres', [], 'YrZ0qzBi-kk', [
    'Em pé, segure os halteres com as palmas viradas uma para a outra.',
    'Mantenha os cotovelos junto ao corpo.',
    'Suba os halteres sem girar os punhos, até perto dos ombros.',
    'Desça devagar até estender os braços.',
  ]),
  'Rosca Scott (máquina)': g('maquina', [], 'dVKX-gyJYSI', [
    'Ajuste o assento para que as axilas fiquem bem encaixadas no alto do apoio.',
    'Apoie toda a parte de trás dos braços na almofada e segure as pegadas.',
    'Dobre os cotovelos levando as pegadas até perto dos ombros.',
    'Desça devagar, sem estender os cotovelos de forma brusca no final.',
  ]),
  'Rosca direta (cabo)': g('cabo', [], 'zqklqTcOsbo', [
    'Fique de frente para a polia baixa segurando a barra com as palmas para cima.',
    'Dê um pequeno passo para trás e deixe os cotovelos junto ao corpo.',
    'Dobre os cotovelos trazendo a barra até perto do peito.',
    'Volte devagar até estender os braços.',
  ]),
  'Rosca concentrada (halter)': g('halteres', [], 'NftBaXxrLJ4', [
    'Sente no banco com as pernas afastadas e segure um halter com uma das mãos.',
    'Apoie o cotovelo na parte de dentro da coxa.',
    'Suba o halter até perto do ombro, sem mexer o cotovelo.',
    'Desça devagar. Faça todas as repetições e troque de braço.',
  ]),

  // ---------------------------------------------------------------- tríceps
  'Tríceps na polia com corda': g('cabo', [], 'KhK5HWJfsrQ', [
    'Prenda a corda na polia alta e segure uma ponta em cada mão.',
    'Fique com os cotovelos colados ao corpo e o tronco levemente inclinado.',
    'Estenda os cotovelos empurrando a corda para baixo e abrindo as pontas no final.',
    'Volte devagar até os antebraços ficarem um pouco acima da linha do cotovelo.',
  ]),
  'Tríceps na polia com barra reta': g('cabo', [], 'wQdCw93LkcI', [
    'Segure a barra na polia alta com as palmas para baixo, na largura dos ombros.',
    'Mantenha os cotovelos junto ao corpo e o tronco firme.',
    'Empurre a barra para baixo até estender os cotovelos.',
    'Volte devagar, sem deixar os cotovelos subirem.',
  ]),
  'Tríceps testa (barra)': g('barra', [], 'aHUB1thRUiY', [
    'Deite no banco segurando a barra acima do peito, mãos mais fechadas que os ombros.',
    'Incline um pouco os braços para trás e mantenha os cotovelos apontando para cima.',
    'Dobre apenas os cotovelos, descendo a barra até perto da testa.',
    'Estenda os cotovelos e volte à posição inicial.',
  ]),
  'Tríceps francês (halter)': g('halteres', [], 'gB-QMYMlHLs', [
    'Sente com as costas apoiadas e segure um halter com as duas mãos acima da cabeça.',
    'Mantenha os cotovelos apontando para cima, perto da cabeça.',
    'Desça o halter atrás da cabeça dobrando só os cotovelos.',
    'Estenda os cotovelos voltando o halter para cima.',
  ]),
  'Tríceps coice (cabo)': g('cabo', [], '6DSDuaIiz8M', [
    'Segure a pegada da polia baixa com uma mão e incline o tronco à frente.',
    'Deixe o cotovelo junto ao corpo, dobrado a 90°.',
    'Estenda o cotovelo levando a mão para trás, sem mexer o braço.',
    'Volte devagar. Faça todas as repetições e troque de lado.',
  ]),
  'Tríceps no banco': g('peso_corporal', ['peito', 'ombros'], 'jH9RXQjbXqs', [
    'Sente na beirada do banco e apoie as mãos ao lado do quadril, dedos para a frente.',
    'Tire o quadril do banco e estenda as pernas (ou dobre os joelhos para facilitar).',
    'Desça o corpo dobrando os cotovelos para trás até cerca de 90°.',
    'Empurre o banco e suba estendendo os cotovelos.',
  ]),
  Paralelas: g('peso_corporal', ['peito', 'ombros'], 'bk6UHwIuOiM', [
    'Segure as barras paralelas e suba até ficar com os braços estendidos.',
    'Mantenha o corpo firme, com os ombros longe das orelhas.',
    'Desça dobrando os cotovelos até cerca de 90°. Tronco reto foca no tríceps; inclinado, no peito.',
    'Empurre as barras e suba até estender os braços.',
  ]),

  // ---------------------------------------------------------------- quadríceps
  'Agachamento livre (barra)': g('barra', ['gluteos', 'posteriores', 'abdomen'], '6ppjJrbrW7g', [
    'Apoie a barra no alto das costas (não no pescoço) e fique com os pés na largura dos ombros.',
    'Contraia o abdômen, olhe para a frente e mantenha o peito aberto.',
    'Desça levando o quadril para trás e para baixo, joelhos na direção dos pés.',
    'Suba empurrando o chão, sem deixar os joelhos caírem para dentro.',
  ]),
  'Agachamento no Smith': g('maquina', ['gluteos', 'posteriores'], 'uDBQtlCLQ0Y', [
    'Apoie a barra no alto das costas e posicione os pés um pouco à frente da linha da barra.',
    'Destrave a barra girando os punhos e contraia o abdômen.',
    'Desça dobrando joelhos e quadril até as coxas ficarem perto da linha do chão.',
    'Suba empurrando o chão. No fim da série, trave a barra no suporte.',
  ]),
  'Agachamento hack (máquina)': g('maquina', ['gluteos'], 'Whp712OHPl8', [
    'Encoste as costas e os ombros nas almofadas e posicione os pés no meio da plataforma.',
    'Destrave a máquina e mantenha o abdômen firme.',
    'Desça dobrando os joelhos com controle, sem tirar as costas do apoio.',
    'Suba empurrando a plataforma, sem travar os joelhos no alto.',
  ]),
  'Agachamento (peso do corpo)': g('peso_corporal', ['gluteos', 'posteriores'], 'ajzahtQpPAg', [
    'Fique em pé com os pés na largura dos ombros e os braços à frente para equilibrar.',
    'Contraia o abdômen e mantenha o peito aberto.',
    'Desça levando o quadril para trás, como se fosse sentar numa cadeira, joelhos na direção dos pés.',
    'Suba empurrando o chão com o pé inteiro.',
  ]),
  'Leg press 45°': g('maquina', ['gluteos', 'posteriores'], 'waAxlYvtCcI', [
    'Sente com as costas e o quadril bem apoiados e os pés na plataforma, na largura do quadril.',
    'Destrave a plataforma segurando as alças laterais.',
    'Desça dobrando os joelhos até cerca de 90°, sem o quadril sair do encosto.',
    'Empurre a plataforma sem travar os joelhos no final.',
  ]),
  'Cadeira extensora': g('maquina', [], 'Svq2T3L9oKo', [
    'Ajuste o encosto para o joelho ficar alinhado com o eixo da máquina.',
    'Encaixe o rolo logo acima do tornozelo e segure as alças.',
    'Estenda os joelhos até as pernas ficarem retas, contraindo a coxa.',
    'Desça devagar, sem deixar o peso bater.',
  ]),
  'Afundo (halteres)': g('halteres', ['gluteos', 'posteriores'], '9bxRdpUFW4c', [
    'Em pé, segure um halter em cada mão ao lado do corpo.',
    'Dê um passo grande à frente, mantendo o tronco reto.',
    'Desça até os dois joelhos ficarem perto de 90°, sem o joelho da frente passar muito dos dedos.',
    'Empurre com a perna da frente para voltar. Alterne as pernas.',
  ]),
  'Agachamento búlgaro (halteres)': g('halteres', ['gluteos', 'posteriores'], 'IL4ebT8L1aQ', [
    'Fique de costas para um banco e apoie o peito do pé de trás sobre ele.',
    'Segure os halteres ao lado do corpo e afaste o pé da frente o suficiente.',
    'Desça dobrando o joelho da frente até a coxa ficar perto da linha do chão.',
    'Suba empurrando com a perna da frente. Faça as repetições e troque de perna.',
  ]),

  // ---------------------------------------------------------------- posteriores
  'Mesa flexora': g('maquina', ['panturrilhas'], 'dMYsB4Eb2BY', [
    'Deite de bruços com os joelhos logo após a borda do banco e o rolo acima do calcanhar.',
    'Segure as alças e mantenha o quadril colado no banco.',
    'Dobre os joelhos trazendo o rolo em direção aos glúteos.',
    'Volte devagar até quase estender as pernas.',
  ]),
  'Cadeira flexora': g('maquina', ['panturrilhas'], 'AFG0wxXmTH4', [
    'Ajuste o encosto para o joelho ficar alinhado com o eixo e prenda as coxas com a trava.',
    'Apoie o rolo logo acima do calcanhar.',
    'Dobre os joelhos empurrando o rolo para baixo e para trás.',
    'Volte devagar até estender as pernas.',
  ]),
  'Stiff (barra)': g('barra', ['gluteos', 'costas'], 'd6B1gWaEtmA', [
    'Em pé, segure a barra à frente das coxas com os pés na largura do quadril.',
    'Mantenha os joelhos levemente dobrados e a coluna reta.',
    'Leve o quadril para trás descendo a barra rente às pernas até sentir alongar atrás da coxa.',
    'Suba contraindo os glúteos, sem arredondar as costas.',
  ]),
  'Stiff (halteres)': g('halteres', ['gluteos', 'costas'], 'cETLf4xXYCQ', [
    'Em pé, segure os halteres à frente das coxas.',
    'Mantenha os joelhos levemente dobrados e a coluna reta.',
    'Leve o quadril para trás e desça os halteres rente às pernas.',
    'Suba contraindo os glúteos e a parte de trás das coxas.',
  ]),
  'Levantamento terra romeno': g('barra', ['gluteos', 'costas'], 'jSomWOwLiGE', [
    'Comece em pé segurando a barra, com os joelhos levemente dobrados.',
    'Mantenha a barra colada às coxas e a coluna reta.',
    'Leve o quadril para trás e desça a barra até um pouco abaixo dos joelhos.',
    'Volte empurrando o quadril para a frente e contraindo os glúteos.',
  ]),

  // ---------------------------------------------------------------- glúteos
  'Elevação pélvica (barra)': g('barra', ['posteriores'], '3mnHo-F-U4Q', [
    'Apoie a parte de cima das costas num banco e a barra (com protetor) sobre o quadril.',
    'Pés firmes no chão, na largura do quadril, joelhos dobrados.',
    'Suba o quadril até o tronco ficar alinhado com as coxas, contraindo os glúteos.',
    'Desça com controle sem encostar o quadril no chão.',
  ]),
  'Elevação pélvica (peso do corpo)': g('peso_corporal', ['posteriores'], '7ESBuNXXgwI', [
    'Deite de costas com os joelhos dobrados e os pés apoiados no chão, na largura do quadril.',
    'Deixe os braços ao lado do corpo, palmas para baixo.',
    'Suba o quadril contraindo os glúteos até o corpo formar uma linha dos ombros aos joelhos.',
    'Segure 1 segundo no alto e desça devagar. Para dificultar, faça com uma perna só.',
  ]),
  'Glúteo no cabo': g('cabo', ['posteriores'], 'XYCCcD0MxN8', [
    'Prenda a tornozeleira na polia baixa e fique de frente para a máquina, segurando nela.',
    'Incline levemente o tronco e mantenha o abdômen firme.',
    'Leve a perna para trás e para cima, contraindo o glúteo, sem arquear a lombar.',
    'Volte devagar. Faça todas as repetições e troque de perna.',
  ]),
  'Cadeira abdutora': g('maquina', [], 'TeDXvAKcFrM', [
    'Sente com as costas apoiadas e as pernas por dentro das almofadas.',
    'Segure as alças e mantenha o quadril firme no assento.',
    'Afaste as pernas para os lados o máximo que conseguir com controle.',
    'Volte devagar sem deixar o peso bater.',
  ]),
  'Cadeira adutora': g('maquina', [], 'Wf602gn_9zU', [
    'Sente com as costas apoiadas e as pernas por fora das almofadas, abertas.',
    'Ajuste a abertura para começar num ponto confortável.',
    'Junte as pernas apertando as almofadas uma contra a outra.',
    'Volte abrindo devagar.',
  ]),

  // ---------------------------------------------------------------- panturrilhas
  'Panturrilha em pé (máquina)': g('maquina', [], 'tPiLhI7TkLE', [
    'Encaixe os ombros nas almofadas e apoie a ponta dos pés na borda da plataforma.',
    'Mantenha os joelhos estendidos (sem travar) e o corpo reto.',
    'Suba na ponta dos pés o mais alto que conseguir.',
    'Desça devagar até sentir a panturrilha alongar.',
  ]),
  'Panturrilha em pé (peso do corpo)': g('peso_corporal', [], 'LJiPSblRWhg', [
    'Apoie a ponta dos pés na beira de um degrau, segurando numa parede ou corrimão.',
    'Deixe os calcanhares para fora do degrau, com os joelhos estendidos.',
    'Suba na ponta dos pés o mais alto que conseguir.',
    'Desça devagar até sentir a panturrilha alongar. Sem degrau, faça no chão.',
  ]),
  'Panturrilha sentada (máquina)': g('maquina', [], 'Nap62yku2ks', [
    'Sente e apoie a ponta dos pés na borda da plataforma.',
    'Ajuste as almofadas para ficarem bem encaixadas sobre as coxas, perto dos joelhos.',
    'Suba os calcanhares o máximo possível.',
    'Desça devagar até alongar a panturrilha.',
  ]),
  'Panturrilha no leg press': g('maquina', [], 'aPhesY3Z0RI', [
    'Sente no leg press e apoie só a ponta dos pés na borda de baixo da plataforma.',
    'Estenda os joelhos sem travar. Não destrave as travas de segurança se não precisar.',
    'Empurre a plataforma com a ponta dos pés, estendendo os tornozelos.',
    'Volte devagar até alongar a panturrilha.',
  ]),

  // ---------------------------------------------------------------- abdômen
  'Abdominal supra': g('peso_corporal', [], '7YxVRiATugo', [
    'Deite de costas com os joelhos dobrados e os pés apoiados no chão.',
    'Cruze os braços no peito ou apoie as mãos atrás da cabeça, sem puxar o pescoço.',
    'Suba o tronco enrolando a coluna até tirar as escápulas do chão, soltando o ar.',
    'Desça devagar.',
  ]),
  'Abdominal na máquina': g('maquina', [], 'rSlTGve9n0Y', [
    'Ajuste o assento e segure as pegadas ou apoie os braços nas almofadas.',
    'Mantenha o quadril firme no banco.',
    'Flexione o tronco para a frente contraindo o abdômen, soltando o ar.',
    'Volte devagar, sem deixar o peso bater.',
  ]),
  'Abdominal no cabo': g('cabo', [], '4v3BMvp3zFA', [
    'Prenda a corda na polia alta e ajoelhe de frente para a máquina.',
    'Segure a corda ao lado do rosto.',
    'Enrole o tronco para baixo levando os cotovelos em direção às coxas.',
    'Volte devagar, sem sentar sobre os calcanhares.',
  ]),
  'Elevação de pernas': g('peso_corporal', [], 'E53_oQ6gIyE', [
    'Deite de costas com as pernas estendidas e as mãos ao lado do corpo ou sob o quadril.',
    'Pressione a lombar contra o chão.',
    'Eleve as pernas juntas até formarem 90° com o tronco.',
    'Desça devagar sem deixar a lombar sair do chão. Dobre os joelhos para facilitar.',
  ]),
  Prancha: g('peso_corporal', ['ombros'], 'Yu0wjtD5FkU', [
    'Apoie os antebraços no chão, cotovelos abaixo dos ombros.',
    'Estenda as pernas e apoie a ponta dos pés.',
    'Deixe o corpo em linha reta, contraindo abdômen e glúteos, sem subir ou baixar o quadril.',
    'Segure a posição respirando normalmente. Registre o tempo em segundos nas repetições.',
  ]),

  // ---------------------------------------------------------------- cardio
  Esteira: g('maquina', ['quadriceps', 'panturrilhas'], 'raa5u4CF2Q4', [
    'Suba nas laterais, prenda a chave de segurança na roupa e comece em velocidade baixa.',
    'Caminhe no centro da esteira, olhando para a frente e com o tronco reto.',
    'Aumente a velocidade ou a inclinação aos poucos, sem se apoiar nos braços da esteira.',
    'Reduza a velocidade no final para desacelerar antes de descer.',
  ]),
  'Bicicleta ergométrica': g('maquina', ['quadriceps', 'gluteos'], '_NyqsWSkOKc', [
    'Ajuste o banco na altura do quadril: com o pedal embaixo, o joelho fica quase estendido.',
    'Ajuste o guidão para pedalar com as costas confortáveis.',
    'Comece com carga leve e pedale num ritmo constante.',
    'Aumente a carga aos poucos e reduza no final para desacelerar.',
  ]),
  Elíptico: g('maquina', ['quadriceps', 'gluteos'], 'Rltlu55sBLE', [
    'Suba nos pedais segurando as alças fixas e comece devagar.',
    'Mantenha o tronco reto e os pés inteiros apoiados nos pedais.',
    'Use as alças móveis para trabalhar também os braços.',
    'Ajuste a resistência aos poucos.',
  ]),
  Escada: g('maquina', ['gluteos', 'quadriceps', 'panturrilhas'], 'nal_FtVy8yk', [
    'Suba segurando as alças e comece no nível mais baixo.',
    'Pise com o pé inteiro em cada degrau e mantenha o tronco reto.',
    'Use as alças só para equilíbrio, sem apoiar o peso do corpo nelas.',
    'Aumente a velocidade aos poucos.',
  ]),
  'Remo ergômetro': g('maquina', ['costas', 'quadriceps', 'biceps'], 'oDtV66s1wQM', [
    'Prenda os pés nas faixas e segure o puxador com os braços estendidos.',
    'Comece empurrando com as pernas, depois incline o tronco levemente para trás.',
    'Termine puxando o puxador até a parte baixa do peito.',
    'Volte na ordem contrária: braços, tronco e, por último, pernas.',
  ]),
  Polichinelo: g('peso_corporal', ['quadriceps', 'panturrilhas', 'ombros'], 'S2uqQ9zHZMc', [
    'Fique em pé com os pés juntos e os braços ao lado do corpo.',
    'Salte abrindo as pernas e levando os braços acima da cabeça.',
    'Salte de novo voltando à posição inicial.',
    'Mantenha um ritmo constante e aterrisse com a ponta dos pés. Sem saltar: abra uma perna de cada vez.',
  ]),
}

/** Equipamento de um exercício fora da lista, pelo que vem entre parênteses no nome. */
export function guessEquipment(name: string): Equipment | undefined {
  const n = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (/\bhalter/.test(n)) return 'halteres'
  if (/\b(cabo|polia|crossover)\b/.test(n)) return 'cabo'
  if (/\b(maquina|smith|leg press|cadeira|mesa)\b/.test(n)) return 'maquina'
  if (/\bbarra\b/.test(n) && !/barra fixa/.test(n)) return 'barra'
  return undefined
}

/** Busca no YouTube, para exercícios criados pela pessoa sem vídeo próprio. */
export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`como fazer ${name} execução`)}`
}
