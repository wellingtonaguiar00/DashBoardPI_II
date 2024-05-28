// Função para carregar e renderizar os gráficos
async function loadAndRenderCharts(region, uf) {
    // Inicializa o Parse
    Parse.initialize("OEAZ5jlnqRkRPtQE0JqhaFYR7pTPzbtWZKlq1Fk5", "jw06RXDuYwYPnwPUXyu4mrx66QExaXL4oD21a0dO");
    Parse.serverURL = 'https://parseapi.back4app.com/';

    try {
        // Consulta a classe 'INEP'
        const INEP = Parse.Object.extend("INEP");
        const query = new Parse.Query(INEP);
        // Filtra os resultados pela região e UF selecionadas
        query.equalTo("REGIAO", region);
        query.equalTo("UF", uf);
        query.limit(10000); // Ajusta o limite de resultados para a consulta

        console.log(`Iniciando consulta para região: ${region}, UF: ${uf}`);
        
        let results = [];
        let page = 0;
        let paginatedResults;

        do {
            paginatedResults = await query.find();
            console.log(`Resultados da página ${page}:`, paginatedResults.length);
            results = results.concat(paginatedResults);
            page++;
            query.skip(page * 10000);
        } while (paginatedResults.length === 10000);

        console.log(`Total de resultados recuperados: ${results.length}`);

        // Verifica alguns registros brutos
        results.slice(0, 5).forEach(result => {
            console.log('Registro bruto:', result.toJSON());
        });

        // Formata os dados conforme necessário para os gráficos
        const data = formatData(results);

        console.log("Dados formatados:", data);

        // Cria os gráficos com os dados obtidos
        renderCharts(data);

    } catch (error) {
        console.error('Erro ao carregar os dados:', error);
    }
}

// Função para formatar os dados para os gráficos
function formatData(results) {
    let totalMasculino = 0;
    let totalFeminino = 0;
    let totalBranco = 0;
    let totalPreto = 0;
    let totalPardo = 0;
    let totalNaoDeclarado = 0;
    let totalMatriculado = 0;
    let alunosPorMunicipio = {};
    let sexoPorMunicipio = {};

    // Iterar sobre os resultados e somar os valores de cada linha
    results.forEach(result => {
        const qtfem = result.get('QTFEMININO') || 0;
        const qtmasc = result.get('QTMASCULINO') || 0;
        const qtbranco = result.get('QTMATBASBRANCA') || 0;
        const qtpreto = result.get('QTMATBASPRETA') || 0;
        const qtpardo = result.get('QTMATBASPARDA') || 0;
        const qtnd = result.get('QTMATBASND') || 0;
        const qttotal = result.get('QTMATRICULADO') || 0;

        totalMasculino += qtmasc;
        totalFeminino += qtfem;
        totalBranco += qtbranco;
        totalPreto += qtpreto;
        totalPardo += qtpardo;
        totalNaoDeclarado += qtnd;
        totalMatriculado += qttotal;

        const municipio = result.get('MUNICIPIO');
        if (municipio) {
            alunosPorMunicipio[municipio] = (alunosPorMunicipio[municipio] || 0) + qttotal;

            if (!sexoPorMunicipio[municipio]) {
                sexoPorMunicipio[municipio] = { masculino: 0, feminino: 0 };
            }
            sexoPorMunicipio[municipio].masculino += qtmasc;
            sexoPorMunicipio[municipio].feminino += qtfem;
        }
    });

    return {
        totalMasculino,
        totalFeminino,
        totalBranco,
        totalPreto,
        totalPardo,
        totalNaoDeclarado,
        totalMatriculado,
        alunosPorMunicipio,
        sexoPorMunicipio
    };
}

// Função para renderizar os gráficos com os dados
function renderCharts(data) {
    // Gráfico 1: Alunos por sexo
    createPieChart('chart1', ['Masculino', 'Feminino'], [data.totalMasculino, data.totalFeminino], ['#36a2eb', '#ff6384']);

    // Gráfico 2: Alunos brancos em relação ao total de matriculados
    createPieChart('chart2', ['Brancos', 'Outros'], [data.totalBranco, data.totalMatriculado - data.totalBranco], ['#ffcd56', '#4bc0c0']);

    // Gráfico 3: Alunos pretos em relação ao total de matriculados
    createPieChart('chart3', ['Pretos', 'Outros'], [data.totalPreto, data.totalMatriculado - data.totalPreto], ['#ff9f40', '#4bc0c0']);

    // Gráfico 4: Alunos pardos em relação ao total de matriculados
    createPieChart('chart4', ['Pardos', 'Outros'], [data.totalPardo, data.totalMatriculado - data.totalPardo], ['#9966ff', '#4bc0c0']);

    // Gráfico 5: Alunos não declarados em relação ao total de matriculados
    createPieChart('chart5', ['Não Declarados', 'Outros'], [data.totalNaoDeclarado, data.totalMatriculado - data.totalNaoDeclarado], ['#c9cbcf', '#4bc0c0']);

    // Gráfico 6: Número de Alunos por Município
    createBarChart('chart6', Object.keys(data.alunosPorMunicipio), Object.values(data.alunosPorMunicipio), 'Número de Alunos', '#36a2eb');

    // Gráfico 7: Distribuição de Alunos por Sexo em Cada Município
    const municipios = Object.keys(data.sexoPorMunicipio);
    const masculinoPorMunicipio = municipios.map(municipio => data.sexoPorMunicipio[municipio].masculino);
    const femininoPorMunicipio = municipios.map(municipio => data.sexoPorMunicipio[municipio].feminino);

    createGroupedBarChart('chart7', municipios, masculinoPorMunicipio, femininoPorMunicipio, ['Masculino', 'Feminino'], ['#36a2eb', '#ff6384']);
}

// Função para criar um gráfico de pizza
function createPieChart(chartId, labels, data, backgroundColors) {
    const ctx = document.getElementById(chartId).getElementsByTagName('canvas')[0].getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors
            }]
        }
    });
}

// Função para criar um gráfico de barras
function createBarChart(chartId, labels, data, label, backgroundColor) {
    const ctx = document.getElementById(chartId).getElementsByTagName('canvas')[0].getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: backgroundColor
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Função para criar um gráfico de barras agrupadas
function createGroupedBarChart(chartId, labels, data1, data2, legends, backgroundColors) {
    const ctx = document.getElementById(chartId).getElementsByTagName('canvas')[0].getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: legends[0],
                    data: data1,
                    backgroundColor: backgroundColors[0]
                },
                {
                    label: legends[1],
                    data: data2,
                    backgroundColor: backgroundColors[1]
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Adiciona um event listener aos botões de filtro
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', function() {
            const region = 'Nordeste'; // Região fixa para esse exemplo
            const uf = button.getAttribute('data-region');
            loadAndRenderCharts(region, uf);
        });
    });

    // Carrega e renderiza os gráficos para Pernambuco por padrão
    loadAndRenderCharts('Nordeste', 'Pernambuco');
});
