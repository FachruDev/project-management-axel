<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Project Preparation Import Guide</title>
    <style>
        @page { margin: 8mm; }
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            color: #0f172a;
            font-size: 9px;
            line-height: 1.35;
        }
        h1, h2 { margin: 0; }
        h1 { font-size: 19px; }
        h2 {
            font-size: 12px;
            margin-top: 10px;
            margin-bottom: 5px;
            padding-bottom: 3px;
            border-bottom: 1px solid #cbd5e1;
        }
        .meta { color: #475569; margin-top: 3px; }
        .intro { width: 100%; margin-top: 10px; border-spacing: 0; }
        .intro td { width: 50%; vertical-align: top; padding-right: 8px; }
        ul { margin: 4px 0 0 15px; padding: 0; }
        li { margin-bottom: 3px; }
        table.data {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
            page-break-inside: avoid;
        }
        table.data th {
            background: #e2e8f0;
            border: 1px solid #94a3b8;
            padding: 4px;
            text-align: left;
            font-weight: 700;
        }
        table.data td {
            border: 1px solid #cbd5e1;
            padding: 4px;
            vertical-align: top;
        }
        .muted { color: #64748b; }
        .grid { width: 100%; border-spacing: 8px 0; }
        .grid td { width: 50%; vertical-align: top; }
        .empty { color: #64748b; font-style: italic; }
    </style>
</head>
<body>
    <h1>Project Preparation Import Guide</h1>
    <div class="meta">Master data reference and template instructions. Generated at {{ $generatedAt }}.</div>

    <table class="intro">
        <tr>
            <td>
                <h2>Import Rules</h2>
                <ul>
                    @foreach ($importRules as $rule)
                        <li>{{ $rule }}</li>
                    @endforeach
                </ul>
            </td>
            <td>
                <h2>Allowed Values</h2>
                <ul>
                    @foreach ($allowedValues as $value)
                        <li>{{ $value }}</li>
                    @endforeach
                </ul>
            </td>
        </tr>
    </table>

    <h2>Required Columns By Sheet</h2>
    <table class="data">
        <thead>
            <tr>
                <th style="width: 18%;">Sheet</th>
                <th>Required columns</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($requiredColumns as $row)
                <tr>
                    <td>{{ $row[0] }}</td>
                    <td>{{ $row[1] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="grid">
        <tr>
            <td>
                <h2>Active Incentive Profiles</h2>
                @include('pdfs.partials.simple-table', ['headers' => ['code', 'version', 'name', 'status'], 'rows' => $data['profiles']])
            </td>
            <td>
                <h2>Active Task Types</h2>
                @include('pdfs.partials.simple-table', ['headers' => ['name', 'scope', 'project_id'], 'rows' => $data['task_types']])
            </td>
        </tr>
        <tr>
            <td>
                <h2>Project Role Codes By Active Profile</h2>
                @include('pdfs.partials.simple-table', ['headers' => ['profile', 'role_code', 'role_name', 'is_support'], 'rows' => $data['project_roles']])
            </td>
            <td>
                <h2>PIC Level Codes By Active Profile</h2>
                @include('pdfs.partials.simple-table', ['headers' => ['profile', 'level_code', 'level_name'], 'rows' => $data['pic_levels']])
            </td>
        </tr>
        <tr>
            <td>
                <h2>Active Users <span class="muted">(max 100)</span></h2>
                @include('pdfs.partials.simple-table', ['headers' => ['email', 'name', 'department', 'roles'], 'rows' => $data['users']])
            </td>
            <td>
                <h2>Active Customers <span class="muted">(max 100)</span></h2>
                @include('pdfs.partials.simple-table', ['headers' => ['email', 'name', 'company_name'], 'rows' => $data['customers']])
            </td>
        </tr>
    </table>
</body>
</html>
