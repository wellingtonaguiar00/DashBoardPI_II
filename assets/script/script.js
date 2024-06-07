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

let chartInstances = {};

async function loadAndRenderCharts(region, uf) {
    // Inicializando o Parse
    Parse.initialize("OEAZ5jlnqRkRPtQE0JqhaFYR7pTPzbtWZKlq1Fk5", "jw06RXDuYwYPnwPUXyu4mrx66QExaXL4oD21a0dO");
    Parse.serverURL = 'https://parseapi.back4app.com/';

    // Mapeamento dos nomes das UFs para suas versões acentuadas
    const ufMap = {
        'Alagoas': 'Alagoas',
        'Bahia': 'Bahia',
        'Ceara': 'Ceará',
        'Maranhao': 'Maranhão',
        'Paraiba': 'Paraíba',
        'Pernambuco': 'Pernambuco',
        'Piaui': 'Piauí',
        'RioGrandeDoNorte': 'Rio Grande do Norte',
        'Sergipe': 'Sergipe'
    };

    // Verifique se o UF precisa ser mapeado para a versão acentuada
    const ufWithAccent = ufMap[uf] || uf;

    try {
        // Consulta a classe 'INEP'
        const INEP = Parse.Object.extend("INEP");
        const query = new Parse.Query(INEP);
        // Filtra os resultados pela região e UF selecionadas
        query.equalTo("REGIAO", region);
        query.equalTo("UF", ufWithAccent);
        query.limit(10000); // Ajusta o limite de resultados para a consulta

        console.log(`Iniciando consulta para região: ${region}, UF: ${ufWithAccent}`);
        
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

        // Destruir gráficos existentes
        destroyExistingCharts();

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

// Função para destruir gráficos existentes
function destroyExistingCharts() {
    for (let chartId in chartInstances) {
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
            chartInstances[chartId] = null;
        }
    }
}

// Função para renderizar os gráficos com os dados
function renderCharts(data) {
    // Gráfico 1: Alunos por sexo
    chartInstances['chart1'] = createPieChart('chart1', ['Masculino', 'Feminino'], [data.totalMasculino, data.totalFeminino], ['#36a2eb', '#ff6384']);

    // Gráfico 2: Alunos brancos em relação ao total de matriculados
    chartInstances['chart2'] = createPieChart('chart2', ['Brancos', 'Outros'], [data.totalBranco, data.totalMatriculado - data.totalBranco], ['#ffcd56', '#4bc0c0']);

    // Gráfico 3: Alunos pretos em relação ao total de matriculados
    chartInstances['chart3'] = createPieChart('chart3', ['Pretos', 'Outros'], [data.totalPreto, data.totalMatriculado - data.totalPreto], ['#ff9f40', '#9966ff']);

    // Gráfico 4: Alunos pardos em relação ao total de matriculados
    chartInstances['chart4'] = createPieChart('chart4', ['Pardos', 'Outros'], [data.totalPardo, data.totalMatriculado - data.totalPardo], ['#ff6384', '#36a2eb']);

    // Gráfico 5: Alunos não declarados em relação ao total de matriculados
    chartInstances['chart5'] = createPieChart('chart5', ['Não Declarados', 'Outros'], [data.totalNaoDeclarado, data.totalMatriculado - data.totalNaoDeclarado], ['#4bc0c0', '#ffcd56']);

    // Gráfico 6: Total de alunos por município
    const municipios = Object.keys(data.alunosPorMunicipio);
    const totalAlunosPorMunicipio = municipios.map(municipio => data.alunosPorMunicipio[municipio]);
    chartInstances['chart6'] = createBarChart('chart6', municipios, totalAlunosPorMunicipio, 'Total de Alunos', '#36a2eb');

    // Gráfico 7: Distribuição de alunos por sexo em cada município
    const totalMasculinoPorMunicipio = municipios.map(municipio => data.sexoPorMunicipio[municipio].masculino);
    const totalFemininoPorMunicipio = municipios.map(municipio => data.sexoPorMunicipio[municipio].feminino);
    chartInstances['chart7'] = createGroupedBarChart('chart7', municipios, totalMasculinoPorMunicipio, totalFemininoPorMunicipio, ['Masculino', 'Feminino'], ['#36a2eb', '#ff6384']);
}

// Função para criar um gráfico de pizza
function createPieChart(chartId, labels, data, backgroundColors) {
    const ctx = document.getElementById(chartId).getElementsByTagName('canvas')[0].getContext('2d');
    return new Chart(ctx, {
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
    return new Chart(ctx, {
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
    return new Chart(ctx, {
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
document.addEventListener("DOMContentLoaded", function () {
    const filterButtons = document.querySelectorAll(".filter-button");

    filterButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const region = this.getAttribute("data-region");

            // Adiciona a classe 'active' ao botão clicado
            filterButtons.forEach((btn) => {
                btn.classList.remove("active");
            });
            this.classList.add("active");

            // Aqui você pode chamar a função que renderiza os gráficos com base no estado selecionado (region)
            // Por exemplo: renderCharts(region);
        });
    });
});
