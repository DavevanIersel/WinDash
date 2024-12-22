import { execSync } from 'child_process';

exports.default = function (context) {
    try {
        execSync(
            'python -m castlabs_evs.vmp sign-pkg .\\dist\\win ' +
                context.appOutDir
        );
    } catch (error) {
        console.log(error);
    }
};
